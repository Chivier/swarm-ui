//! Workflow scheduler implementation
//!
//! The scheduler determines which server should execute each node,
//! taking into account:
//! - Data locality (DataRef locations)
//! - Server load and availability
//! - LLM session affinity
//! - Resource requirements

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::dag::WorkflowDag;
use swarmx_events::Event;

/// Server information for scheduling decisions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    /// Server address (e.g., "http://localhost:9090")
    pub address: String,
    /// Available memory in bytes
    pub available_memory: u64,
    /// Whether GPU is available
    pub gpu_available: bool,
    /// Current load (0.0 to 1.0)
    pub current_load: f64,
    /// Supported node types
    pub capabilities: Vec<String>,
    /// Currently loaded models (for LLM affinity)
    pub loaded_models: Vec<String>,
    /// Whether the server is healthy
    pub healthy: bool,
}

impl ServerInfo {
    /// Create a new server info
    pub fn new(address: String) -> Self {
        Self {
            address,
            available_memory: 0,
            gpu_available: false,
            current_load: 0.0,
            capabilities: Vec::new(),
            loaded_models: Vec::new(),
            healthy: true,
        }
    }

    /// Check if server can handle a specific node type
    pub fn supports(&self, node_type: &str) -> bool {
        self.capabilities.is_empty() || self.capabilities.iter().any(|c| node_type.starts_with(c))
    }

    /// Check if server has a model loaded
    pub fn has_model(&self, model_id: &str) -> bool {
        self.loaded_models.iter().any(|m| m == model_id)
    }
}

/// Scheduling decision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchedulingDecision {
    /// Node to be scheduled
    pub node_id: Uuid,
    /// Target server address
    pub target_server: String,
    /// Priority (higher = more urgent)
    pub priority: u32,
    /// Reason for choosing this server
    pub affinity_reason: Option<String>,
    /// Estimated execution time in milliseconds
    pub estimated_duration_ms: Option<u64>,
}

/// Retry policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryPolicy {
    /// Maximum number of retries
    pub max_retries: u32,
    /// Initial backoff delay in milliseconds
    pub backoff_ms: u64,
    /// Backoff multiplier for exponential backoff
    pub backoff_multiplier: f64,
    /// Maximum backoff delay in milliseconds
    pub max_backoff_ms: u64,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 3,
            backoff_ms: 1000,
            backoff_multiplier: 2.0,
            max_backoff_ms: 30000,
        }
    }
}

impl RetryPolicy {
    /// Calculate backoff delay for a given retry attempt
    pub fn calculate_backoff(&self, retry_count: u32) -> u64 {
        let delay = self.backoff_ms as f64 * self.backoff_multiplier.powi(retry_count as i32);
        (delay as u64).min(self.max_backoff_ms)
    }
}

/// Scheduling strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum SchedulingStrategy {
    /// Round-robin across available servers
    #[default]
    RoundRobin,
    /// Prefer server with lowest load
    LeastLoaded,
    /// Prefer server with data locality
    DataAffinity,
    /// Prefer server with LLM session affinity
    SessionAffinity,
    /// Random selection
    Random,
}

/// The workflow scheduler
pub struct Scheduler {
    /// Registered servers
    servers: HashMap<String, ServerInfo>,
    /// Retry policy
    retry_policy: RetryPolicy,
    /// Event sender for publishing scheduling events
    event_tx: Option<mpsc::Sender<Event>>,
    /// Scheduling strategy
    strategy: SchedulingStrategy,
    /// Round-robin index
    rr_index: usize,
    /// LLM session affinities (session_id -> preferred_server)
    session_affinities: HashMap<Uuid, String>,
}

impl Scheduler {
    /// Create a new scheduler with default retry policy
    pub fn new(retry_policy: RetryPolicy) -> Self {
        Self {
            servers: HashMap::new(),
            retry_policy,
            event_tx: None,
            strategy: SchedulingStrategy::default(),
            rr_index: 0,
            session_affinities: HashMap::new(),
        }
    }

    /// Set the event sender
    pub fn with_event_sender(mut self, tx: mpsc::Sender<Event>) -> Self {
        self.event_tx = Some(tx);
        self
    }

    /// Set the scheduling strategy
    pub fn with_strategy(mut self, strategy: SchedulingStrategy) -> Self {
        self.strategy = strategy;
        self
    }

    /// Register a server for scheduling
    pub fn register_server(&mut self, server: ServerInfo) {
        self.servers.insert(server.address.clone(), server);
    }

    /// Update server information
    pub fn update_server(&mut self, server: ServerInfo) {
        self.servers.insert(server.address.clone(), server);
    }

    /// Remove a server from the scheduling pool
    pub fn unregister_server(&mut self, address: &str) {
        self.servers.remove(address);
    }

    /// Get server information
    pub fn get_server(&self, address: &str) -> Option<&ServerInfo> {
        self.servers.get(address)
    }

    /// Get all registered servers
    pub fn servers(&self) -> impl Iterator<Item = &ServerInfo> {
        self.servers.values()
    }

    /// Get healthy servers
    pub fn healthy_servers(&self) -> impl Iterator<Item = &ServerInfo> {
        self.servers.values().filter(|s| s.healthy)
    }

    /// Schedule the next ready node from the DAG
    pub fn schedule_next(&mut self, dag: &WorkflowDag) -> Option<SchedulingDecision> {
        let ready_nodes = dag.get_ready_nodes();
        if ready_nodes.is_empty() {
            return None;
        }

        // Schedule the first ready node
        let node_id = ready_nodes[0];
        self.schedule_node(node_id, dag)
    }

    /// Schedule a specific node
    pub fn schedule_node(
        &mut self,
        node_id: Uuid,
        dag: &WorkflowDag,
    ) -> Option<SchedulingDecision> {
        let _node = dag.get_node(node_id)?;

        // Collect healthy servers into owned data to avoid borrow issues
        let healthy_servers: Vec<ServerInfo> = self
            .servers
            .values()
            .filter(|s| s.healthy)
            .cloned()
            .collect();

        if healthy_servers.is_empty() {
            return None;
        }

        // Find suitable server based on strategy
        let (target_server, reason) = match self.strategy {
            SchedulingStrategy::RoundRobin => {
                let idx = self.rr_index % healthy_servers.len();
                self.rr_index = (self.rr_index + 1) % healthy_servers.len();
                (healthy_servers[idx].address.clone(), None)
            }
            SchedulingStrategy::LeastLoaded => {
                let server = healthy_servers
                    .iter()
                    .min_by(|a, b| a.current_load.partial_cmp(&b.current_load).unwrap())
                    .unwrap();
                (server.address.clone(), Some("least loaded".to_string()))
            }
            _ => {
                // Default to first healthy server
                (healthy_servers[0].address.clone(), None)
            }
        };

        Some(SchedulingDecision {
            node_id,
            target_server,
            priority: 0,
            affinity_reason: reason,
            estimated_duration_ms: None,
        })
    }

    /// Schedule with server affinity preference
    pub fn schedule_with_affinity(
        &mut self,
        node_id: Uuid,
        preferred_server: Option<&str>,
        dag: &WorkflowDag,
    ) -> Option<SchedulingDecision> {
        // Check if preferred server is available
        if let Some(addr) = preferred_server {
            if let Some(server) = self.servers.get(addr) {
                if server.healthy {
                    return Some(SchedulingDecision {
                        node_id,
                        target_server: addr.to_string(),
                        priority: 0,
                        affinity_reason: Some("user preference".to_string()),
                        estimated_duration_ms: None,
                    });
                }
            }
        }

        // Fall back to normal scheduling
        self.schedule_node(node_id, dag)
    }

    /// Set LLM session affinity
    pub fn set_session_affinity(&mut self, session_id: Uuid, server: String) {
        self.session_affinities.insert(session_id, server);
    }

    /// Get session affinity
    pub fn get_session_affinity(&self, session_id: &Uuid) -> Option<&String> {
        self.session_affinities.get(session_id)
    }

    /// Calculate backoff delay for a retry
    pub fn calculate_backoff(&self, retry_count: u32) -> u64 {
        self.retry_policy.calculate_backoff(retry_count)
    }

    /// Update server load
    pub fn update_server_load(&mut self, address: &str, load: f64) {
        if let Some(server) = self.servers.get_mut(address) {
            server.current_load = load;
        }
    }

    /// Mark server as unhealthy
    pub fn mark_unhealthy(&mut self, address: &str) {
        if let Some(server) = self.servers.get_mut(address) {
            server.healthy = false;
        }
    }

    /// Mark server as healthy
    pub fn mark_healthy(&mut self, address: &str) {
        if let Some(server) = self.servers.get_mut(address) {
            server.healthy = true;
        }
    }

    /// Get the retry policy
    pub fn retry_policy(&self) -> &RetryPolicy {
        &self.retry_policy
    }
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new(RetryPolicy::default())
    }
}

/// Scheduling metrics for monitoring
#[derive(Debug, Clone, Default)]
pub struct SchedulerMetrics {
    /// Total nodes scheduled
    pub nodes_scheduled: u64,
    /// Nodes currently executing
    pub nodes_running: u64,
    /// Nodes completed successfully
    pub nodes_completed: u64,
    /// Nodes failed
    pub nodes_failed: u64,
    /// Total retries
    pub total_retries: u64,
}

impl SchedulerMetrics {
    /// Record a node scheduled
    pub fn record_scheduled(&mut self) {
        self.nodes_scheduled += 1;
        self.nodes_running += 1;
    }

    /// Record a node completed
    pub fn record_completed(&mut self) {
        self.nodes_completed += 1;
        self.nodes_running = self.nodes_running.saturating_sub(1);
    }

    /// Record a node failed
    pub fn record_failed(&mut self) {
        self.nodes_failed += 1;
        self.nodes_running = self.nodes_running.saturating_sub(1);
    }

    /// Record a retry
    pub fn record_retry(&mut self) {
        self.total_retries += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retry_policy_backoff() {
        let policy = RetryPolicy::default();

        assert_eq!(policy.calculate_backoff(0), 1000);
        assert_eq!(policy.calculate_backoff(1), 2000);
        assert_eq!(policy.calculate_backoff(2), 4000);
    }

    #[test]
    fn test_server_registration() {
        let mut scheduler = Scheduler::default();

        let server = ServerInfo::new("http://localhost:9090".to_string());
        scheduler.register_server(server);

        assert!(scheduler.get_server("http://localhost:9090").is_some());
    }

    #[test]
    fn test_server_capabilities() {
        let mut server = ServerInfo::new("test".to_string());
        server.capabilities = vec!["ai.".to_string(), "code.".to_string()];

        assert!(server.supports("ai.openai.chat"));
        assert!(server.supports("code.python"));
        assert!(!server.supports("http.request"));
    }
}
