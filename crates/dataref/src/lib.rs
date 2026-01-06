//! SwarmX DataRef - Global pointer system for distributed data
//!
//! This crate implements the PGAS-style (Partitioned Global Address Space) data
//! reference system for SwarmX-UI. DataRef provides location-aware, immutable
//! references to data objects distributed across the SwarmX cluster.

pub mod pointer;
pub mod token;

pub use pointer::*;
pub use token::*;
