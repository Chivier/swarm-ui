//! Node state machine implementation
//!
//! Tracks the execution state of each node in the workflow DAG.
//! State transitions are validated to ensure correct execution flow.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Node execution states
///
/// ```text
/// Node State Machine:
///
///     ┌─────────┐     schedule      ┌───────────┐
///     │ Pending │ ─────────────────►│ Scheduled │
///     └─────────┘                   └─────┬─────┘
///          ▲                              │
///          │ retry                        │ server accepts
///          │                              ▼
///     ┌─────────┐     success       ┌───────────┐
///     │ Failed  │◄──────────────────│  Running  │
///     └─────────┘     failure       └─────┬─────┘
///                                         │
///                                         │ complete
///                                         ▼
///                                   ┌───────────┐
///                                   │   Done    │
///                                   └───────────┘
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeState {
    /// Node is waiting for dependencies to complete
    Pending,
    /// Node has been scheduled for execution on a server
    Scheduled,
    /// Node is currently executing
    Running,
    /// Node completed successfully
    Done,
    /// Node execution failed
    Failed,
    /// Node was cancelled
    Cancelled,
    /// Node is being retried
    Retrying,
}

impl Default for NodeState {
    fn default() -> Self {
        Self::Pending
    }
}

impl NodeState {
    /// Check if this is a terminal state
    pub fn is_terminal(&self) -> bool {
        matches!(self, NodeState::Done | NodeState::Failed | NodeState::Cancelled)
    }

    /// Check if the node can be scheduled
    pub fn can_schedule(&self) -> bool {
        matches!(self, NodeState::Pending | NodeState::Retrying)
    }

    /// Check if the node is actively executing
    pub fn is_active(&self) -> bool {
        matches!(self, NodeState::Scheduled | NodeState::Running)
    }

    /// Get valid transitions from this state
    pub fn valid_transitions(&self) -> Vec<NodeState> {
        match self {
            NodeState::Pending => vec![NodeState::Scheduled, NodeState::Cancelled],
            NodeState::Scheduled => vec![NodeState::Running, NodeState::Failed, NodeState::Cancelled],
            NodeState::Running => vec![NodeState::Done, NodeState::Failed, NodeState::Cancelled],
            NodeState::Failed => vec![NodeState::Retrying, NodeState::Cancelled],
            NodeState::Retrying => vec![NodeState::Scheduled, NodeState::Cancelled],
            NodeState::Done => vec![],
            NodeState::Cancelled => vec![],
        }
    }
}

/// State transition record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransition {
    /// Previous state
    pub from: NodeState,
    /// New state
    pub to: NodeState,
    /// When the transition occurred
    pub timestamp: DateTime<Utc>,
    /// Optional reason for the transition
    pub reason: Option<String>,
}

impl StateTransition {
    /// Create a new state transition
    pub fn new(from: NodeState, to: NodeState, reason: Option<String>) -> Self {
        Self {
            from,
            to,
            timestamp: Utc::now(),
            reason,
        }
    }
}

/// Node execution context
///
/// Tracks the full execution state of a node including retry information,
/// timing, and error details.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeContext {
    /// Node identifier
    pub node_id: Uuid,
    /// Workflow identifier
    pub workflow_id: Uuid,
    /// Current state
    pub state: NodeState,
    /// Number of retry attempts
    pub retry_count: u32,
    /// Maximum allowed retries
    pub max_retries: u32,
    /// Last error message if failed
    pub last_error: Option<String>,
    /// When execution started
    pub started_at: Option<DateTime<Utc>>,
    /// When execution completed
    pub completed_at: Option<DateTime<Utc>>,
    /// Server where the node is/was executing
    pub server: Option<String>,
    /// History of state transitions
    pub transitions: Vec<StateTransition>,
}

impl NodeContext {
    /// Create a new node context
    pub fn new(node_id: Uuid, workflow_id: Uuid) -> Self {
        Self {
            node_id,
            workflow_id,
            state: NodeState::Pending,
            retry_count: 0,
            max_retries: 3,
            last_error: None,
            started_at: None,
            completed_at: None,
            server: None,
            transitions: Vec::new(),
        }
    }

    /// Create a new node context with custom retry settings
    pub fn with_retries(node_id: Uuid, workflow_id: Uuid, max_retries: u32) -> Self {
        let mut ctx = Self::new(node_id, workflow_id);
        ctx.max_retries = max_retries;
        ctx
    }

    /// Transition to a new state
    pub fn transition(&mut self, to: NodeState) -> Result<StateTransition, StateError> {
        self.transition_with_reason(to, None)
    }

    /// Transition to a new state with a reason
    pub fn transition_with_reason(
        &mut self,
        to: NodeState,
        reason: Option<String>,
    ) -> Result<StateTransition, StateError> {
        if !self.can_transition_to(to) {
            return Err(StateError::InvalidTransition {
                from: self.state,
                to,
            });
        }

        let transition = StateTransition::new(self.state, to, reason);
        self.transitions.push(transition.clone());
        self.state = to;

        // Update timing information
        match to {
            NodeState::Running => {
                if self.started_at.is_none() {
                    self.started_at = Some(Utc::now());
                }
            }
            NodeState::Done | NodeState::Failed | NodeState::Cancelled => {
                self.completed_at = Some(Utc::now());
            }
            NodeState::Retrying => {
                self.retry_count += 1;
            }
            _ => {}
        }

        Ok(transition)
    }

    /// Check if a transition to the given state is valid
    pub fn can_transition_to(&self, to: NodeState) -> bool {
        self.state.valid_transitions().contains(&to)
    }

    /// Mark the node as failed with an error
    pub fn fail(&mut self, error: String) -> Result<StateTransition, StateError> {
        self.last_error = Some(error.clone());
        self.transition_with_reason(NodeState::Failed, Some(error))
    }

    /// Check if the node can be retried
    pub fn can_retry(&self) -> bool {
        self.state == NodeState::Failed && self.retry_count < self.max_retries
    }

    /// Get the execution duration if completed
    pub fn duration(&self) -> Option<chrono::Duration> {
        match (self.started_at, self.completed_at) {
            (Some(start), Some(end)) => Some(end - start),
            _ => None,
        }
    }

    /// Get duration in milliseconds
    pub fn duration_ms(&self) -> Option<u64> {
        self.duration().map(|d| d.num_milliseconds() as u64)
    }
}

/// Workflow execution context
///
/// Tracks the overall state of a workflow execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowContext {
    /// Workflow identifier
    pub workflow_id: Uuid,
    /// Execution identifier (unique per execution)
    pub execution_id: Uuid,
    /// Workflow name
    pub name: String,
    /// Overall workflow state
    pub state: WorkflowState,
    /// When execution started
    pub started_at: DateTime<Utc>,
    /// When execution completed
    pub completed_at: Option<DateTime<Utc>>,
    /// Node contexts
    pub nodes: std::collections::HashMap<Uuid, NodeContext>,
}

/// Workflow execution states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowState {
    /// Workflow is pending start
    Pending,
    /// Workflow is actively executing
    Running,
    /// Workflow completed successfully
    Completed,
    /// Workflow failed
    Failed,
    /// Workflow was cancelled
    Cancelled,
}

impl WorkflowContext {
    /// Create a new workflow context
    pub fn new(workflow_id: Uuid, name: String) -> Self {
        Self {
            workflow_id,
            execution_id: Uuid::new_v4(),
            name,
            state: WorkflowState::Pending,
            started_at: Utc::now(),
            completed_at: None,
            nodes: std::collections::HashMap::new(),
        }
    }

    /// Add a node context
    pub fn add_node(&mut self, node_id: Uuid) {
        let ctx = NodeContext::new(node_id, self.workflow_id);
        self.nodes.insert(node_id, ctx);
    }

    /// Get a node context
    pub fn get_node(&self, node_id: &Uuid) -> Option<&NodeContext> {
        self.nodes.get(node_id)
    }

    /// Get a mutable node context
    pub fn get_node_mut(&mut self, node_id: &Uuid) -> Option<&mut NodeContext> {
        self.nodes.get_mut(node_id)
    }

    /// Calculate overall progress (0.0 to 1.0)
    pub fn progress(&self) -> f64 {
        if self.nodes.is_empty() {
            return 0.0;
        }
        let completed = self
            .nodes
            .values()
            .filter(|n| n.state.is_terminal())
            .count();
        completed as f64 / self.nodes.len() as f64
    }

    /// Check if workflow is complete
    pub fn is_complete(&self) -> bool {
        self.nodes.values().all(|n| n.state.is_terminal())
    }
}

/// State machine errors
#[derive(Debug, thiserror::Error)]
pub enum StateError {
    #[error("Invalid state transition from {from:?} to {to:?}")]
    InvalidTransition { from: NodeState, to: NodeState },

    #[error("Maximum retries exceeded: {0}")]
    MaxRetriesExceeded(u32),

    #[error("Node not found: {0}")]
    NodeNotFound(Uuid),

    #[error("Workflow not found: {0}")]
    WorkflowNotFound(Uuid),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_state_default() {
        assert_eq!(NodeState::default(), NodeState::Pending);
    }

    #[test]
    fn test_valid_transitions() {
        let pending = NodeState::Pending;
        assert!(pending.valid_transitions().contains(&NodeState::Scheduled));
        assert!(!pending.valid_transitions().contains(&NodeState::Done));
    }

    #[test]
    fn test_node_context_transition() {
        let mut ctx = NodeContext::new(Uuid::new_v4(), Uuid::new_v4());
        assert_eq!(ctx.state, NodeState::Pending);

        ctx.transition(NodeState::Scheduled).unwrap();
        assert_eq!(ctx.state, NodeState::Scheduled);

        ctx.transition(NodeState::Running).unwrap();
        assert_eq!(ctx.state, NodeState::Running);

        ctx.transition(NodeState::Done).unwrap();
        assert_eq!(ctx.state, NodeState::Done);
        assert!(ctx.completed_at.is_some());
    }

    #[test]
    fn test_invalid_transition() {
        let mut ctx = NodeContext::new(Uuid::new_v4(), Uuid::new_v4());
        let result = ctx.transition(NodeState::Done);
        assert!(result.is_err());
    }
}
