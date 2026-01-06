//! SwarmX-UI API Server
//!
//! The main entry point for the SwarmX-UI HTTP API server.
//! Provides endpoints for workflow management, execution, and data access.

use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    routing::{get, post, delete},
    Router,
};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod callback;
mod handlers;

use handlers::*;
use callback::*;

/// Application state shared across all handlers
#[derive(Clone)]
pub struct AppState {
    inner: Arc<AppStateInner>,
}

/// Inner state (wrapped in Arc for cheap cloning)
pub struct AppStateInner {
    /// Workflow storage
    pub workflows: RwLock<WorkflowStore>,
    /// Execution state
    pub executions: RwLock<ExecutionStore>,
    /// Server registry
    pub servers: RwLock<ServerRegistry>,
}

/// In-memory workflow storage
pub struct WorkflowStore {
    workflows: std::collections::HashMap<uuid::Uuid, swarmx_protocol::WorkflowDefinition>,
}

impl WorkflowStore {
    pub fn new() -> Self {
        Self {
            workflows: std::collections::HashMap::new(),
        }
    }
}

impl Default for WorkflowStore {
    fn default() -> Self {
        Self::new()
    }
}

/// In-memory execution state storage
pub struct ExecutionStore {
    executions: std::collections::HashMap<uuid::Uuid, ExecutionState>,
}

impl ExecutionStore {
    pub fn new() -> Self {
        Self {
            executions: std::collections::HashMap::new(),
        }
    }
}

impl Default for ExecutionStore {
    fn default() -> Self {
        Self::new()
    }
}

/// Execution state for a running workflow
pub struct ExecutionState {
    pub execution_id: uuid::Uuid,
    pub workflow_id: uuid::Uuid,
    pub status: String,
    pub progress: f64,
    pub started_at: chrono::DateTime<chrono::Utc>,
}

/// Server registry for scheduling
pub struct ServerRegistry {
    servers: std::collections::HashMap<String, swarmx_core::ServerInfo>,
}

impl ServerRegistry {
    pub fn new() -> Self {
        Self {
            servers: std::collections::HashMap::new(),
        }
    }
}

impl Default for ServerRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl AppState {
    /// Create a new application state
    pub fn new() -> Self {
        Self {
            inner: Arc::new(AppStateInner {
                workflows: RwLock::new(WorkflowStore::new()),
                executions: RwLock::new(ExecutionStore::new()),
                servers: RwLock::new(ServerRegistry::new()),
            }),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,swarmx_api=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = AppState::new();

    // Build the router
    let app = Router::new()
        // Workflow CRUD endpoints
        .route("/api/workflows", get(list_workflows).post(create_workflow))
        .route(
            "/api/workflows/{id}",
            get(get_workflow)
                .put(update_workflow)
                .delete(delete_workflow),
        )
        // Workflow execution endpoints
        .route("/api/workflows/{id}/execute", post(execute_workflow))
        .route("/api/workflows/{id}/status", get(workflow_status))
        // Execution management
        .route("/api/executions", get(list_executions))
        .route("/api/executions/{id}", get(get_execution))
        .route("/api/executions/{id}/cancel", post(cancel_execution))
        // Task endpoints
        .route("/api/tasks/{id}", get(get_task_status))
        .route("/api/tasks/{id}/cancel", post(cancel_task))
        // Callback endpoint (receives from servers)
        .route("/api/callback", post(handle_callback))
        // Data endpoints
        .route("/api/data/{uuid}", get(get_data).delete(delete_data))
        // Server registry
        .route("/api/servers", get(list_servers).post(register_server))
        .route("/api/servers/{address}", delete(unregister_server))
        // Health check
        .route("/health", get(health_check))
        .route("/api/health", get(health_check))
        // Add middleware
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Start the server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("Starting SwarmX-UI server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}
