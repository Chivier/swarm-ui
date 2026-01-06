//! DataRef pointer implementation - PGAS-style global data references
//!
//! DataRef is the core abstraction for data management in SwarmX-UI,
//! inspired by PGAS (Partitioned Global Address Space) systems.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Storage tier for data placement
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageTier {
    /// GPU Video RAM - fastest, most limited
    Vram,
    /// System RAM - fast, limited
    Dram,
    /// Disk storage - slowest, most abundant
    Disk,
}

impl Default for StorageTier {
    fn default() -> Self {
        Self::Dram
    }
}

/// Tensor data type specification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TensorDType {
    Float16,
    Float32,
    Float64,
    Int8,
    Int16,
    Int32,
    Int64,
    Uint8,
    Bool,
    BFloat16,
}

/// Data type enumeration for DataRef
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DataType {
    /// Tensor data with shape and element type
    Tensor { shape: Vec<usize>, dtype: TensorDType },
    /// JSON-serializable data
    Json,
    /// Raw bytes
    Bytes,
    /// LLM KV Cache
    KvCache { model_id: String, seq_len: usize },
    /// File with MIME type
    File { mime_type: String },
}

/// Global data reference - the core abstraction for distributed data
///
/// DataRef represents an immutable reference to data stored somewhere
/// in the SwarmX cluster. Key properties:
/// - Immutable: Once created, data is never modified (copy-on-write semantics)
/// - Location-aware: Scheduler uses location for affinity decisions
/// - Tiered storage: Automatic offload from VRAM -> DRAM -> Disk under pressure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataRef {
    /// Globally unique identifier
    pub uuid: Uuid,
    /// Current primary location (server address)
    pub location: String,
    /// Size hint for scheduling decisions
    pub size_bytes: u64,
    /// Type tag for the data
    pub dtype: DataType,
    /// Current storage tier
    pub storage_tier: StorageTier,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Associated workflow ID for lifecycle management
    pub workflow_id: Uuid,
    /// Optional checksum for integrity verification
    pub checksum: Option<String>,
}

impl DataRef {
    /// Create a new DataRef
    pub fn new(
        location: String,
        size_bytes: u64,
        dtype: DataType,
        workflow_id: Uuid,
    ) -> Self {
        todo!("Implement DataRef::new")
    }

    /// Create a DataRef for inline JSON data
    pub fn json(location: String, workflow_id: Uuid, data: &serde_json::Value) -> Self {
        todo!("Implement DataRef::json")
    }

    /// Create a DataRef for a file
    pub fn file(
        location: String,
        workflow_id: Uuid,
        size_bytes: u64,
        mime_type: String,
    ) -> Self {
        todo!("Implement DataRef::file")
    }

    /// Create a DataRef for tensor data
    pub fn tensor(
        location: String,
        workflow_id: Uuid,
        size_bytes: u64,
        shape: Vec<usize>,
        dtype: TensorDType,
    ) -> Self {
        todo!("Implement DataRef::tensor")
    }

    /// Check if data is considered "small" (can be inlined in messages)
    /// Default threshold: 64KB
    pub fn is_inline_eligible(&self) -> bool {
        todo!("Implement inline eligibility check")
    }

    /// Estimate transfer cost to a target server
    /// Returns estimated milliseconds for transfer
    pub fn transfer_cost(&self, target: &str) -> u64 {
        todo!("Implement transfer cost estimation")
    }

    /// Check if this DataRef is on the same server as the target
    pub fn is_local_to(&self, server: &str) -> bool {
        self.location == server
    }
}

/// LLM Session with KV cache affinity
///
/// Special handling for LLM workloads due to KV cache locality.
/// The scheduler maintains session affinity to avoid expensive KV cache migration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmSession {
    /// Session identifier
    pub session_id: Uuid,
    /// Model identifier (e.g., "deepseek-coder")
    pub model_id: String,
    /// Reference to KV cache data
    pub kv_cache_ref: Option<DataRef>,
    /// Preferred server for affinity
    pub preferred_server: String,
    /// Current sequence length
    pub seq_length: usize,
    /// Maximum sequence length
    pub max_seq_length: usize,
}

impl LlmSession {
    /// Create a new LLM session
    pub fn new(model_id: String, preferred_server: String, max_seq_length: usize) -> Self {
        todo!("Implement LlmSession::new")
    }

    /// Update the KV cache reference after generation
    pub fn update_kv_cache(&mut self, kv_cache_ref: DataRef, new_seq_length: usize) {
        todo!("Implement KV cache update")
    }

    /// Determine if session should migrate to a different server
    pub fn should_migrate(&self, target_server: &str) -> bool {
        todo!("Determine if session should migrate")
    }

    /// Check if the session can accept more tokens
    pub fn has_capacity(&self, additional_tokens: usize) -> bool {
        self.seq_length + additional_tokens <= self.max_seq_length
    }
}

/// DataRef-related errors
#[derive(Debug, thiserror::Error)]
pub enum DataRefError {
    #[error("DataRef not found: {0}")]
    NotFound(Uuid),

    #[error("Storage tier not available: {0:?}")]
    TierNotAvailable(StorageTier),

    #[error("Transfer failed: {0}")]
    TransferFailed(String),

    #[error("Invalid data type: {0}")]
    InvalidDataType(String),

    #[error("Checksum mismatch")]
    ChecksumMismatch,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_tier_default() {
        assert_eq!(StorageTier::default(), StorageTier::Dram);
    }

    #[test]
    fn test_is_local_to() {
        let data_ref = DataRef {
            uuid: Uuid::new_v4(),
            location: "server-a".to_string(),
            size_bytes: 1024,
            dtype: DataType::Json,
            storage_tier: StorageTier::Dram,
            created_at: Utc::now(),
            workflow_id: Uuid::new_v4(),
            checksum: None,
        };

        assert!(data_ref.is_local_to("server-a"));
        assert!(!data_ref.is_local_to("server-b"));
    }
}
