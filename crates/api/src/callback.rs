//! Callback handler for receiving task completion notifications from servers
//!
//! Servers send callback messages to notify the client about:
//! - Task progress updates
//! - Task completion with outputs
//! - Task failure with error details

use axum::{extract::State, http::StatusCode, Json};

use crate::AppState;
use swarmx_protocol::CallbackMessage;

/// Handle callback from server
///
/// This endpoint receives callbacks from SwarmX servers when:
/// - A task makes progress
/// - A task completes successfully
/// - A task fails
///
/// The handler updates the execution state and triggers downstream
/// node scheduling when a node completes.
pub async fn handle_callback(
    State(state): State<AppState>,
    Json(message): Json<CallbackMessage>,
) -> StatusCode {
    match &message {
        CallbackMessage::Progress {
            task_id,
            progress,
            message: msg,
            ..
        } => {
            tracing::info!(
                task_id = %task_id,
                progress = %progress,
                message = ?msg,
                "Task progress update"
            );
            handle_progress(state, task_id, *progress, msg.clone()).await
        }
        CallbackMessage::Complete {
            task_id,
            outputs,
            duration_ms,
            ..
        } => {
            tracing::info!(
                task_id = %task_id,
                outputs = outputs.len(),
                duration_ms = %duration_ms,
                "Task completed"
            );
            handle_complete(state, task_id, outputs, *duration_ms).await
        }
        CallbackMessage::Failed {
            task_id,
            error,
            error_code,
            ..
        } => {
            tracing::error!(
                task_id = %task_id,
                error = %error,
                error_code = ?error_code,
                "Task failed"
            );
            handle_failed(state, task_id, error, error_code.clone()).await
        }
    }
}

/// Handle task progress update
async fn handle_progress(
    _state: AppState,
    _task_id: &uuid::Uuid,
    _progress: f64,
    _message: Option<String>,
) -> StatusCode {
    todo!("Implement progress handling: update node state, emit event")
}

/// Handle task completion
async fn handle_complete(
    _state: AppState,
    _task_id: &uuid::Uuid,
    _outputs: &[swarmx_protocol::TaskOutput],
    _duration_ms: u64,
) -> StatusCode {
    todo!("Implement completion handling: update node state, store outputs, schedule downstream nodes")
}

/// Handle task failure
async fn handle_failed(
    _state: AppState,
    _task_id: &uuid::Uuid,
    _error: &str,
    _error_code: Option<String>,
) -> StatusCode {
    todo!("Implement failure handling: update node state, apply retry policy, emit event")
}

/// Callback acknowledgment response
#[derive(serde::Serialize)]
pub struct CallbackAck {
    pub received: bool,
    pub task_id: uuid::Uuid,
}
