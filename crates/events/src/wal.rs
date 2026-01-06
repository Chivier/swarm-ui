//! Write-Ahead Log implementation for event persistence
//!
//! Events are persisted to SQLite with WAL mode for crash recovery.
//! This provides durability for workflow state across restarts.

use std::path::Path;

use rusqlite::Connection;

use crate::types::{Event, EventEnvelope, EventFilter};

/// Write-Ahead Log for event persistence
pub struct WriteAheadLog {
    /// SQLite connection
    conn: Connection,
    /// Next sequence number to assign
    next_sequence: u64,
}

impl WriteAheadLog {
    /// Open or create a WAL at the given path
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, WalError> {
        let conn = Connection::open(path)?;
        Self::initialize(conn)
    }

    /// Create an in-memory WAL (for testing)
    pub fn in_memory() -> Result<Self, WalError> {
        let conn = Connection::open_in_memory()?;
        Self::initialize(conn)
    }

    /// Initialize the WAL with schema
    fn initialize(conn: Connection) -> Result<Self, WalError> {
        // Enable WAL mode for better concurrency
        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                sequence INTEGER UNIQUE NOT NULL,
                event_type TEXT NOT NULL,
                event_json TEXT NOT NULL,
                workflow_id TEXT,
                node_id TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_events_sequence ON events(sequence);
            CREATE INDEX IF NOT EXISTS idx_events_workflow ON events(workflow_id);
            CREATE INDEX IF NOT EXISTS idx_events_node ON events(node_id);
            CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
            ",
        )?;

        // Get the next sequence number
        let next_sequence: u64 = conn
            .query_row(
                "SELECT COALESCE(MAX(sequence), 0) + 1 FROM events",
                [],
                |row| row.get(0),
            )
            .unwrap_or(1);

        Ok(Self {
            conn,
            next_sequence,
        })
    }

    /// Append an event to the log
    pub fn append(&mut self, event: Event) -> Result<EventEnvelope, WalError> {
        todo!("Implement event append")
    }

    /// Append multiple events atomically
    pub fn append_batch(&mut self, events: Vec<Event>) -> Result<Vec<EventEnvelope>, WalError> {
        todo!("Implement batch append")
    }

    /// Read events from a given sequence number
    pub fn read_from(&self, sequence: u64) -> Result<Vec<EventEnvelope>, WalError> {
        todo!("Implement read from sequence")
    }

    /// Read events matching a filter
    pub fn read_filtered(&self, filter: &EventFilter) -> Result<Vec<EventEnvelope>, WalError> {
        todo!("Implement filtered read")
    }

    /// Get the last sequence number
    pub fn last_sequence(&self) -> u64 {
        self.next_sequence.saturating_sub(1)
    }

    /// Get the next sequence number (without incrementing)
    pub fn peek_next_sequence(&self) -> u64 {
        self.next_sequence
    }

    /// Compact the log (remove old entries)
    /// Returns the number of entries removed
    pub fn compact(&mut self, before_sequence: u64) -> Result<u64, WalError> {
        todo!("Implement log compaction")
    }

    /// Compact entries older than a timestamp
    pub fn compact_before(
        &mut self,
        _before: chrono::DateTime<chrono::Utc>,
    ) -> Result<u64, WalError> {
        todo!("Implement time-based compaction")
    }

    /// Create a checkpoint for crash recovery
    pub fn checkpoint(&self) -> Result<(), WalError> {
        self.conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
        Ok(())
    }

    /// Get total event count
    pub fn count(&self) -> Result<u64, WalError> {
        let count: u64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0))?;
        Ok(count)
    }

    /// Get events for a specific workflow
    pub fn events_for_workflow(&self, workflow_id: uuid::Uuid) -> Result<Vec<EventEnvelope>, WalError> {
        self.read_filtered(&EventFilter::new().workflow(workflow_id))
    }

    /// Get the latest N events
    pub fn latest(&self, n: usize) -> Result<Vec<EventEnvelope>, WalError> {
        todo!("Implement latest events query")
    }
}

/// Event subscriber for real-time event streaming
pub struct EventSubscriber {
    /// Last seen sequence number
    last_sequence: u64,
}

impl EventSubscriber {
    /// Create a new subscriber starting from the latest event
    pub fn new() -> Self {
        Self { last_sequence: 0 }
    }

    /// Create a subscriber starting from a specific sequence
    pub fn from_sequence(sequence: u64) -> Self {
        Self {
            last_sequence: sequence,
        }
    }

    /// Poll for new events
    pub fn poll(&mut self, wal: &WriteAheadLog) -> Result<Vec<EventEnvelope>, WalError> {
        let events = wal.read_from(self.last_sequence + 1)?;
        if let Some(last) = events.last() {
            self.last_sequence = last.sequence;
        }
        Ok(events)
    }
}

impl Default for EventSubscriber {
    fn default() -> Self {
        Self::new()
    }
}

/// WAL errors
#[derive(Debug, thiserror::Error)]
pub enum WalError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Event not found: sequence {0}")]
    EventNotFound(u64),

    #[error("Sequence gap detected: expected {expected}, got {got}")]
    SequenceGap { expected: u64, got: u64 },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wal_creation() {
        let wal = WriteAheadLog::in_memory().unwrap();
        assert_eq!(wal.last_sequence(), 0);
    }
}
