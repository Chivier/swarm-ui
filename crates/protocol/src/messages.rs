//! HTTP request/response message types
//!
//! Defines all message types for the HTTP API between client and servers.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use swarmx_dataref::DataRef;

// ============================================================================
// Task Submission
// ============================================================================

/// Task submission request sent to server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRequest {
    /// Node ID being executed
    pub node_id: Uuid,
    /// Node type (e.g., "ai.openai.chat")
    pub node_type: String,
    /// Input data for the task
    pub inputs: Vec<TaskInput>,
    /// Node configuration
    pub config: serde_json::Value,
    /// URL for server to send callbacks
    pub callback_url: String,
    /// Execution timeout in milliseconds
    pub timeout_ms: Option<u64>,
}

/// Task input - either inline data or a DataRef
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TaskInput {
    /// Inline data (for small values)
    Inline { name: String, value: serde_json::Value },
    /// Reference to remote data
    Reference { name: String, data_ref: DataRef },
}

impl TaskInput {
    /// Create an inline input
    pub fn inline(name: &str, value: serde_json::Value) -> Self {
        Self::Inline {
            name: name.to_string(),
            value,
        }
    }

    /// Create a reference input
    pub fn reference(name: &str, data_ref: DataRef) -> Self {
        Self::Reference {
            name: name.to_string(),
            data_ref,
        }
    }

    /// Get the input name
    pub fn name(&self) -> &str {
        match self {
            Self::Inline { name, .. } => name,
            Self::Reference { name, .. } => name,
        }
    }
}

/// Task submission response from server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResponse {
    /// Server-assigned task ID
    pub task_id: Uuid,
    /// Current task status
    pub status: TaskStatus,
    /// When the task was accepted
    pub accepted_at: DateTime<Utc>,
}

/// Task status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    /// Task accepted and queued
    Accepted,
    /// Task is currently running
    Running,
    /// Task completed successfully
    Complete,
    /// Task failed
    Failed,
    /// Task was cancelled
    Cancelled,
}

// ============================================================================
// Callbacks
// ============================================================================

/// Callback message from server to client
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum CallbackMessage {
    /// Progress update
    Progress {
        task_id: Uuid,
        progress: f64,
        message: Option<String>,
        timestamp: DateTime<Utc>,
    },
    /// Task completed successfully
    Complete {
        task_id: Uuid,
        outputs: Vec<TaskOutput>,
        duration_ms: u64,
        timestamp: DateTime<Utc>,
    },
    /// Task failed
    Failed {
        task_id: Uuid,
        error: String,
        error_code: Option<String>,
        timestamp: DateTime<Utc>,
    },
}

impl CallbackMessage {
    /// Get the task ID
    pub fn task_id(&self) -> Uuid {
        match self {
            Self::Progress { task_id, .. } => *task_id,
            Self::Complete { task_id, .. } => *task_id,
            Self::Failed { task_id, .. } => *task_id,
        }
    }

    /// Create a progress callback
    pub fn progress(task_id: Uuid, progress: f64, message: Option<String>) -> Self {
        Self::Progress {
            task_id,
            progress,
            message,
            timestamp: Utc::now(),
        }
    }

    /// Create a completion callback
    pub fn complete(task_id: Uuid, outputs: Vec<TaskOutput>, duration_ms: u64) -> Self {
        Self::Complete {
            task_id,
            outputs,
            duration_ms,
            timestamp: Utc::now(),
        }
    }

    /// Create a failure callback
    pub fn failed(task_id: Uuid, error: String, error_code: Option<String>) -> Self {
        Self::Failed {
            task_id,
            error,
            error_code,
            timestamp: Utc::now(),
        }
    }
}

/// Task output - either inline data or a DataRef
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TaskOutput {
    /// Inline data (for small values)
    Inline { name: String, value: serde_json::Value },
    /// Reference to remote data
    Reference { name: String, data_ref: DataRef },
}

impl TaskOutput {
    /// Create an inline output
    pub fn inline(name: &str, value: serde_json::Value) -> Self {
        Self::Inline {
            name: name.to_string(),
            value,
        }
    }

    /// Create a reference output
    pub fn reference(name: &str, data_ref: DataRef) -> Self {
        Self::Reference {
            name: name.to_string(),
            data_ref,
        }
    }
}

// ============================================================================
// Task Status Query
// ============================================================================

/// Task status query response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStatusResponse {
    /// Task ID
    pub task_id: Uuid,
    /// Current status
    pub status: TaskStatus,
    /// Progress (0.0 to 1.0)
    pub progress: Option<f64>,
    /// Outputs if complete
    pub outputs: Option<Vec<TaskOutput>>,
    /// Error if failed
    pub error: Option<String>,
    /// When execution started
    pub started_at: Option<DateTime<Utc>>,
    /// When execution completed
    pub completed_at: Option<DateTime<Utc>>,
}

// ============================================================================
// Data Operations
// ============================================================================

/// Data fetch request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataFetchRequest {
    /// UUID of data to fetch
    pub data_uuid: Uuid,
    /// Access token for authorization
    pub access_token: String,
}

/// Data store request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataStoreRequest {
    /// Workflow ID for lifecycle management
    pub workflow_id: Uuid,
    /// Data type
    pub dtype: String,
    /// Content type (MIME)
    pub content_type: String,
    /// Size in bytes
    pub size_bytes: u64,
}

/// Data store response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataStoreResponse {
    /// Created DataRef
    pub data_ref: DataRef,
}

// ============================================================================
// Workflow DSL Types
// ============================================================================

/// Complete workflow definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    /// Workflow ID
    pub id: Uuid,
    /// Workflow name
    pub name: String,
    /// Version number
    pub version: u32,
    /// Workflow variables
    #[serde(default)]
    pub variables: serde_json::Value,
    /// Node definitions
    pub nodes: Vec<WorkflowNodeDef>,
    /// Edge definitions
    pub edges: Vec<WorkflowEdgeDef>,
    /// Execution configuration
    pub execution: ExecutionConfig,
    /// Metadata
    #[serde(default)]
    pub metadata: WorkflowMetadata,
}

impl WorkflowDefinition {
    /// Create a new workflow definition
    pub fn new(name: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.to_string(),
            version: 1,
            variables: serde_json::Value::Object(Default::default()),
            nodes: Vec::new(),
            edges: Vec::new(),
            execution: ExecutionConfig::default(),
            metadata: WorkflowMetadata::default(),
        }
    }

    /// Add a node to the workflow
    pub fn add_node(&mut self, node: WorkflowNodeDef) {
        self.nodes.push(node);
    }

    /// Add an edge to the workflow
    pub fn add_edge(&mut self, edge: WorkflowEdgeDef) {
        self.edges.push(edge);
    }
}

/// Node definition in workflow DSL
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNodeDef {
    /// Node ID (string, can be human-readable)
    pub id: String,
    /// Node type
    #[serde(rename = "type")]
    pub node_type: String,
    /// Display name
    pub name: String,
    /// Configuration
    #[serde(default)]
    pub config: serde_json::Value,
    /// Input port definitions
    #[serde(default)]
    pub inputs: Option<Vec<PortDef>>,
    /// Output port definitions
    #[serde(default)]
    pub outputs: Option<Vec<PortDef>>,
    /// Visual position
    pub position: PositionDef,
}

/// Port definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortDef {
    /// Port name
    pub name: String,
    /// Data type
    pub dtype: String,
    /// Whether required
    #[serde(default)]
    pub required: bool,
    /// Default value
    #[serde(default)]
    pub default: Option<serde_json::Value>,
}

/// Edge definition in workflow DSL
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdgeDef {
    /// Source node ID
    pub source: String,
    /// Source output port name
    pub source_output: String,
    /// Target node ID
    pub target: String,
    /// Target input port name
    pub target_input: String,
    /// Optional transform expression
    #[serde(default)]
    pub transform: Option<String>,
}

/// Position definition
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PositionDef {
    pub x: f64,
    pub y: f64,
}

impl Default for PositionDef {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}

/// Execution configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionConfig {
    /// Execution mode
    pub mode: ExecutionMode,
    /// Server URL (for remote/hybrid)
    #[serde(default)]
    pub server: Option<String>,
    /// Execution timeout in milliseconds
    #[serde(default)]
    pub timeout_ms: Option<u64>,
    /// Retry policy
    #[serde(default)]
    pub retry_policy: Option<RetryPolicyConfig>,
}

impl Default for ExecutionConfig {
    fn default() -> Self {
        Self {
            mode: ExecutionMode::Local,
            server: None,
            timeout_ms: Some(300000), // 5 minutes
            retry_policy: Some(RetryPolicyConfig::default()),
        }
    }
}

/// Execution mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionMode {
    /// Execute locally on client
    #[default]
    Local,
    /// Execute on remote server
    Remote,
    /// Mix of local and remote
    Hybrid,
}

/// Retry policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryPolicyConfig {
    pub max_retries: u32,
    pub backoff_ms: u64,
    pub backoff_multiplier: f64,
}

impl Default for RetryPolicyConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            backoff_ms: 1000,
            backoff_multiplier: 2.0,
        }
    }
}

/// Workflow metadata
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WorkflowMetadata {
    /// Author name
    #[serde(default)]
    pub author: Option<String>,
    /// Tags for categorization
    #[serde(default)]
    pub tags: Vec<String>,
    /// Creation timestamp (Unix ms)
    #[serde(default)]
    pub created_at: Option<i64>,
    /// Last update timestamp (Unix ms)
    #[serde(default)]
    pub updated_at: Option<i64>,
    /// Description
    #[serde(default)]
    pub description: Option<String>,
}

// ============================================================================
// API Responses
// ============================================================================

/// Generic API response wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    /// Whether the request succeeded
    pub success: bool,
    /// Response data (if successful)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    /// Error information (if failed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
}

impl<T> ApiResponse<T> {
    /// Create a successful response
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    /// Create an error response
    pub fn error(code: &str, message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(ApiError {
                code: code.to_string(),
                message: message.to_string(),
                details: None,
            }),
        }
    }

    /// Create an error response with details
    pub fn error_with_details(code: &str, message: &str, details: serde_json::Value) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(ApiError {
                code: code.to_string(),
                message: message.to_string(),
                details: Some(details),
            }),
        }
    }
}

/// API error information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    /// Error code
    pub code: String,
    /// Human-readable message
    pub message: String,
    /// Additional error details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

// ============================================================================
// List/Pagination Types
// ============================================================================

/// Paginated list response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    /// Items in this page
    pub items: Vec<T>,
    /// Total count of items
    pub total: u64,
    /// Current page (0-indexed)
    pub page: u32,
    /// Items per page
    pub page_size: u32,
    /// Whether there are more pages
    pub has_more: bool,
}

impl<T> PaginatedResponse<T> {
    /// Create a new paginated response
    pub fn new(items: Vec<T>, total: u64, page: u32, page_size: u32) -> Self {
        let has_more = (page + 1) * page_size < total as u32;
        Self {
            items,
            total,
            page,
            page_size,
            has_more,
        }
    }
}

/// Workflow list item (summary)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowSummary {
    pub id: Uuid,
    pub name: String,
    pub version: u32,
    pub node_count: usize,
    pub metadata: WorkflowMetadata,
}

/// Execution list item (summary)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionSummary {
    pub execution_id: Uuid,
    pub workflow_id: Uuid,
    pub workflow_name: String,
    pub status: String,
    pub progress: f64,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_request_serialization() {
        let request = TaskRequest {
            node_id: Uuid::new_v4(),
            node_type: "ai.openai.chat".to_string(),
            inputs: vec![TaskInput::inline("prompt", serde_json::json!("Hello"))],
            config: serde_json::json!({"model": "gpt-4"}),
            callback_url: "http://localhost:3000/callback".to_string(),
            timeout_ms: Some(60000),
        };

        let json = serde_json::to_string(&request).unwrap();
        let parsed: TaskRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.node_type, "ai.openai.chat");
    }

    #[test]
    fn test_callback_message_serialization() {
        let msg = CallbackMessage::progress(Uuid::new_v4(), 0.5, Some("Processing".to_string()));
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("progress"));
    }

    #[test]
    fn test_api_response() {
        let response: ApiResponse<String> = ApiResponse::success("Hello".to_string());
        assert!(response.success);
        assert_eq!(response.data, Some("Hello".to_string()));

        let error: ApiResponse<String> = ApiResponse::error("NOT_FOUND", "Resource not found");
        assert!(!error.success);
        assert!(error.error.is_some());
    }
}
