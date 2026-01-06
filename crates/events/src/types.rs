//! Event type definitions for the workflow system
//!
//! All events are persisted to a Write-Ahead Log (WAL) for crash recovery.
//! Optional Kafka integration provides stronger durability guarantees.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Event types for the workflow system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Event {
    // ========================================================================
    // Workflow Events
    // ========================================================================
    /// Workflow execution started
    WorkflowStarted {
        workflow_id: Uuid,
        name: String,
        timestamp: DateTime<Utc>,
    },

    /// Workflow execution completed successfully
    WorkflowCompleted {
        workflow_id: Uuid,
        timestamp: DateTime<Utc>,
        duration_ms: u64,
    },

    /// Workflow execution failed
    WorkflowFailed {
        workflow_id: Uuid,
        error: String,
        timestamp: DateTime<Utc>,
    },

    /// Workflow execution cancelled by user
    WorkflowCancelled {
        workflow_id: Uuid,
        reason: Option<String>,
        timestamp: DateTime<Utc>,
    },

    // ========================================================================
    // Node Events
    // ========================================================================
    /// Node scheduled for execution on a server
    NodeScheduled {
        workflow_id: Uuid,
        node_id: Uuid,
        server: String,
        timestamp: DateTime<Utc>,
    },

    /// Node execution started
    NodeStarted {
        workflow_id: Uuid,
        node_id: Uuid,
        timestamp: DateTime<Utc>,
    },

    /// Node execution progress update
    NodeProgress {
        workflow_id: Uuid,
        node_id: Uuid,
        progress: f64,
        message: Option<String>,
        timestamp: DateTime<Utc>,
    },

    /// Node execution completed successfully
    NodeCompleted {
        workflow_id: Uuid,
        node_id: Uuid,
        output_refs: Vec<Uuid>,
        duration_ms: u64,
        timestamp: DateTime<Utc>,
    },

    /// Node execution failed
    NodeFailed {
        workflow_id: Uuid,
        node_id: Uuid,
        error: String,
        retry_count: u32,
        timestamp: DateTime<Utc>,
    },

    /// Node execution retrying
    NodeRetrying {
        workflow_id: Uuid,
        node_id: Uuid,
        retry_count: u32,
        delay_ms: u64,
        timestamp: DateTime<Utc>,
    },

    // ========================================================================
    // Data Events
    // ========================================================================
    /// Data object created
    DataCreated {
        data_uuid: Uuid,
        workflow_id: Uuid,
        location: String,
        size_bytes: u64,
        timestamp: DateTime<Utc>,
    },

    /// Data transferred between servers
    DataTransferred {
        data_uuid: Uuid,
        from_server: String,
        to_server: String,
        duration_ms: u64,
        timestamp: DateTime<Utc>,
    },

    /// Data deleted
    DataDeleted {
        data_uuid: Uuid,
        timestamp: DateTime<Utc>,
    },

    /// Data storage tier changed
    DataTierChanged {
        data_uuid: Uuid,
        from_tier: String,
        to_tier: String,
        timestamp: DateTime<Utc>,
    },

    // ========================================================================
    // Server Events
    // ========================================================================
    /// Server registered
    ServerRegistered {
        server_address: String,
        capabilities: Vec<String>,
        timestamp: DateTime<Utc>,
    },

    /// Server health check
    ServerHealthCheck {
        server_address: String,
        healthy: bool,
        load: f64,
        timestamp: DateTime<Utc>,
    },

    /// Server disconnected
    ServerDisconnected {
        server_address: String,
        reason: Option<String>,
        timestamp: DateTime<Utc>,
    },
}

impl Event {
    /// Get the event timestamp
    pub fn timestamp(&self) -> DateTime<Utc> {
        match self {
            Event::WorkflowStarted { timestamp, .. } => *timestamp,
            Event::WorkflowCompleted { timestamp, .. } => *timestamp,
            Event::WorkflowFailed { timestamp, .. } => *timestamp,
            Event::WorkflowCancelled { timestamp, .. } => *timestamp,
            Event::NodeScheduled { timestamp, .. } => *timestamp,
            Event::NodeStarted { timestamp, .. } => *timestamp,
            Event::NodeProgress { timestamp, .. } => *timestamp,
            Event::NodeCompleted { timestamp, .. } => *timestamp,
            Event::NodeFailed { timestamp, .. } => *timestamp,
            Event::NodeRetrying { timestamp, .. } => *timestamp,
            Event::DataCreated { timestamp, .. } => *timestamp,
            Event::DataTransferred { timestamp, .. } => *timestamp,
            Event::DataDeleted { timestamp, .. } => *timestamp,
            Event::DataTierChanged { timestamp, .. } => *timestamp,
            Event::ServerRegistered { timestamp, .. } => *timestamp,
            Event::ServerHealthCheck { timestamp, .. } => *timestamp,
            Event::ServerDisconnected { timestamp, .. } => *timestamp,
        }
    }

    /// Get the workflow ID if applicable
    pub fn workflow_id(&self) -> Option<Uuid> {
        match self {
            Event::WorkflowStarted { workflow_id, .. } => Some(*workflow_id),
            Event::WorkflowCompleted { workflow_id, .. } => Some(*workflow_id),
            Event::WorkflowFailed { workflow_id, .. } => Some(*workflow_id),
            Event::WorkflowCancelled { workflow_id, .. } => Some(*workflow_id),
            Event::NodeScheduled { workflow_id, .. } => Some(*workflow_id),
            Event::NodeStarted { workflow_id, .. } => Some(*workflow_id),
            Event::NodeProgress { workflow_id, .. } => Some(*workflow_id),
            Event::NodeCompleted { workflow_id, .. } => Some(*workflow_id),
            Event::NodeFailed { workflow_id, .. } => Some(*workflow_id),
            Event::NodeRetrying { workflow_id, .. } => Some(*workflow_id),
            Event::DataCreated { workflow_id, .. } => Some(*workflow_id),
            _ => None,
        }
    }

    /// Get the node ID if applicable
    pub fn node_id(&self) -> Option<Uuid> {
        match self {
            Event::NodeScheduled { node_id, .. } => Some(*node_id),
            Event::NodeStarted { node_id, .. } => Some(*node_id),
            Event::NodeProgress { node_id, .. } => Some(*node_id),
            Event::NodeCompleted { node_id, .. } => Some(*node_id),
            Event::NodeFailed { node_id, .. } => Some(*node_id),
            Event::NodeRetrying { node_id, .. } => Some(*node_id),
            _ => None,
        }
    }

    /// Serialize event to JSON
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Deserialize event from JSON
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    /// Check if this is a terminal event for a workflow
    pub fn is_workflow_terminal(&self) -> bool {
        matches!(
            self,
            Event::WorkflowCompleted { .. }
                | Event::WorkflowFailed { .. }
                | Event::WorkflowCancelled { .. }
        )
    }

    /// Check if this is a terminal event for a node
    pub fn is_node_terminal(&self) -> bool {
        matches!(
            self,
            Event::NodeCompleted { .. } | Event::NodeFailed { .. }
        )
    }
}

/// Event envelope with metadata for storage and transmission
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope {
    /// Unique event identifier
    pub id: Uuid,
    /// Monotonically increasing sequence number
    pub sequence: u64,
    /// The actual event
    pub event: Event,
    /// When this envelope was created
    pub created_at: DateTime<Utc>,
}

impl EventEnvelope {
    /// Create a new event envelope
    pub fn new(sequence: u64, event: Event) -> Self {
        Self {
            id: Uuid::new_v4(),
            sequence,
            event,
            created_at: Utc::now(),
        }
    }
}

/// Event filter for querying events
#[derive(Debug, Clone, Default)]
pub struct EventFilter {
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<Uuid>,
    pub event_types: Option<Vec<String>>,
    pub from_timestamp: Option<DateTime<Utc>>,
    pub to_timestamp: Option<DateTime<Utc>>,
    pub from_sequence: Option<u64>,
    pub limit: Option<usize>,
}

impl EventFilter {
    /// Create a new empty filter
    pub fn new() -> Self {
        Self::default()
    }

    /// Filter by workflow ID
    pub fn workflow(mut self, workflow_id: Uuid) -> Self {
        self.workflow_id = Some(workflow_id);
        self
    }

    /// Filter by node ID
    pub fn node(mut self, node_id: Uuid) -> Self {
        self.node_id = Some(node_id);
        self
    }

    /// Filter from a specific sequence number
    pub fn from_sequence(mut self, sequence: u64) -> Self {
        self.from_sequence = Some(sequence);
        self
    }

    /// Limit the number of results
    pub fn limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_serialization() {
        let event = Event::WorkflowStarted {
            workflow_id: Uuid::new_v4(),
            name: "test-workflow".to_string(),
            timestamp: Utc::now(),
        };

        let json = event.to_json().unwrap();
        let parsed = Event::from_json(&json).unwrap();

        assert!(matches!(parsed, Event::WorkflowStarted { .. }));
    }

    #[test]
    fn test_event_envelope() {
        let event = Event::NodeStarted {
            workflow_id: Uuid::new_v4(),
            node_id: Uuid::new_v4(),
            timestamp: Utc::now(),
        };

        let envelope = EventEnvelope::new(1, event);
        assert_eq!(envelope.sequence, 1);
    }
}
