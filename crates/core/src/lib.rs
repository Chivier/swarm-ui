//! SwarmX Core - DAG execution engine, scheduler, and state machine
//!
//! This crate provides the core execution engine for SwarmX-UI, including:
//! - DAG (Directed Acyclic Graph) representation and manipulation
//! - Node state machine for tracking execution progress
//! - Scheduler for assigning nodes to servers

pub mod dag;
pub mod scheduler;
pub mod state;

pub use dag::*;
pub use scheduler::*;
pub use state::*;
