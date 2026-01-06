//! SwarmX Events - Event types, WAL, and message queue integration
//!
//! This crate provides the event system for SwarmX-UI, including:
//! - Event type definitions for workflow and node lifecycle
//! - Write-Ahead Log (WAL) for crash recovery
//! - Optional Kafka integration for distributed event streaming

pub mod types;
pub mod wal;

#[cfg(feature = "kafka")]
pub mod kafka;

pub use types::*;
pub use wal::*;
