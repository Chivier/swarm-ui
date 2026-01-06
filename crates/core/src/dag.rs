//! DAG (Directed Acyclic Graph) implementation for workflow execution
//!
//! Workflows are represented as DAGs where:
//! - Nodes represent computation units (LLM call, Python script, HTTP request, etc.)
//! - Edges represent data dependencies (DataRef flows)

use std::collections::HashMap;

use petgraph::graph::{DiGraph, NodeIndex};
use petgraph::visit::EdgeRef;
use petgraph::Direction;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::state::{NodeContext, NodeState};

/// A node in the workflow DAG
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    /// Unique node identifier
    pub id: Uuid,
    /// Node type (e.g., "ai.openai.chat", "code.python")
    pub node_type: String,
    /// Human-readable name
    pub name: String,
    /// Node configuration
    pub config: serde_json::Value,
    /// Input port definitions
    pub inputs: Vec<NodeInput>,
    /// Output port definitions
    pub outputs: Vec<NodeOutput>,
    /// Visual position in the editor
    pub position: Position,
}

/// Node input port definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInput {
    /// Port name
    pub name: String,
    /// Data type (e.g., "string", "json", "tensor")
    pub dtype: String,
    /// Whether this input is required
    pub required: bool,
    /// Default value if not connected
    pub default: Option<serde_json::Value>,
}

/// Node output port definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeOutput {
    /// Port name
    pub name: String,
    /// Data type
    pub dtype: String,
}

/// Visual position in the editor
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

impl Default for Position {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}

/// An edge connecting two nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdge {
    /// Source output port name
    pub source_output: String,
    /// Target input port name
    pub target_input: String,
    /// Optional transform expression (e.g., "{{ value.upper() }}")
    pub transform: Option<String>,
}

/// The workflow DAG structure
pub struct WorkflowDag {
    /// The underlying graph
    graph: DiGraph<WorkflowNode, WorkflowEdge>,
    /// Map from node UUID to graph index
    node_indices: HashMap<Uuid, NodeIndex>,
    /// Node execution contexts
    contexts: HashMap<Uuid, NodeContext>,
    /// Workflow identifier
    workflow_id: Uuid,
}

impl WorkflowDag {
    /// Create a new empty DAG
    pub fn new() -> Self {
        Self {
            graph: DiGraph::new(),
            node_indices: HashMap::new(),
            contexts: HashMap::new(),
            workflow_id: Uuid::new_v4(),
        }
    }

    /// Create a DAG with a specific workflow ID
    pub fn with_id(workflow_id: Uuid) -> Self {
        let mut dag = Self::new();
        dag.workflow_id = workflow_id;
        dag
    }

    /// Parse a DAG from JSON DSL
    pub fn from_json(json: &str) -> Result<Self, DagError> {
        todo!("Implement DAG parsing from JSON DSL")
    }

    /// Serialize the DAG to JSON
    pub fn to_json(&self) -> Result<String, DagError> {
        todo!("Implement DAG serialization to JSON")
    }

    /// Add a node to the DAG
    pub fn add_node(&mut self, node: WorkflowNode) -> NodeIndex {
        let id = node.id;
        let index = self.graph.add_node(node);
        self.node_indices.insert(id, index);

        // Create execution context for the node
        let ctx = NodeContext::new(id, self.workflow_id);
        self.contexts.insert(id, ctx);

        index
    }

    /// Remove a node from the DAG
    pub fn remove_node(&mut self, node_id: Uuid) -> Result<WorkflowNode, DagError> {
        todo!("Implement node removal")
    }

    /// Add an edge between two nodes
    pub fn add_edge(
        &mut self,
        from: Uuid,
        to: Uuid,
        edge: WorkflowEdge,
    ) -> Result<(), DagError> {
        let from_idx = self
            .node_indices
            .get(&from)
            .ok_or(DagError::NodeNotFound(from))?;
        let to_idx = self
            .node_indices
            .get(&to)
            .ok_or(DagError::NodeNotFound(to))?;

        self.graph.add_edge(*from_idx, *to_idx, edge);
        Ok(())
    }

    /// Remove an edge between two nodes
    pub fn remove_edge(&mut self, from: Uuid, to: Uuid) -> Result<(), DagError> {
        todo!("Implement edge removal")
    }

    /// Get a node by ID
    pub fn get_node(&self, node_id: Uuid) -> Option<&WorkflowNode> {
        self.node_indices
            .get(&node_id)
            .and_then(|idx| self.graph.node_weight(*idx))
    }

    /// Get a mutable node by ID
    pub fn get_node_mut(&mut self, node_id: Uuid) -> Option<&mut WorkflowNode> {
        self.node_indices
            .get(&node_id)
            .and_then(|idx| self.graph.node_weight_mut(*idx))
    }

    /// Get the execution context for a node
    pub fn get_context(&self, node_id: Uuid) -> Option<&NodeContext> {
        self.contexts.get(&node_id)
    }

    /// Get mutable execution context for a node
    pub fn get_context_mut(&mut self, node_id: Uuid) -> Option<&mut NodeContext> {
        self.contexts.get_mut(&node_id)
    }

    /// Get nodes that are ready to execute (all dependencies satisfied)
    pub fn get_ready_nodes(&self) -> Vec<Uuid> {
        self.node_indices
            .iter()
            .filter(|(id, idx)| {
                // Check if node is pending
                let ctx = self.contexts.get(id);
                let is_pending = ctx.map(|c| c.state.can_schedule()).unwrap_or(false);

                if !is_pending {
                    return false;
                }

                // Check if all dependencies are done
                let deps_satisfied = self
                    .graph
                    .neighbors_directed(**idx, Direction::Incoming)
                    .all(|dep_idx| {
                        let dep_node = self.graph.node_weight(dep_idx);
                        dep_node
                            .and_then(|n| self.contexts.get(&n.id))
                            .map(|c| c.state == NodeState::Done)
                            .unwrap_or(false)
                    });

                deps_satisfied
            })
            .map(|(id, _)| *id)
            .collect()
    }

    /// Get topological order of nodes
    pub fn topological_order(&self) -> Result<Vec<Uuid>, DagError> {
        todo!("Implement topological sort")
    }

    /// Get upstream dependencies of a node
    pub fn get_dependencies(&self, node_id: Uuid) -> Vec<Uuid> {
        let Some(idx) = self.node_indices.get(&node_id) else {
            return Vec::new();
        };

        self.graph
            .neighbors_directed(*idx, Direction::Incoming)
            .filter_map(|dep_idx| {
                self.graph.node_weight(dep_idx).map(|n| n.id)
            })
            .collect()
    }

    /// Get downstream dependents of a node
    pub fn get_dependents(&self, node_id: Uuid) -> Vec<Uuid> {
        let Some(idx) = self.node_indices.get(&node_id) else {
            return Vec::new();
        };

        self.graph
            .neighbors_directed(*idx, Direction::Outgoing)
            .filter_map(|dep_idx| {
                self.graph.node_weight(dep_idx).map(|n| n.id)
            })
            .collect()
    }

    /// Validate the DAG (no cycles, all edges valid, etc.)
    pub fn validate(&self) -> Result<(), DagError> {
        todo!("Validate DAG has no cycles, all edges valid, etc.")
    }

    /// Get all node IDs
    pub fn node_ids(&self) -> Vec<Uuid> {
        self.node_indices.keys().copied().collect()
    }

    /// Get the number of nodes
    pub fn node_count(&self) -> usize {
        self.graph.node_count()
    }

    /// Get the number of edges
    pub fn edge_count(&self) -> usize {
        self.graph.edge_count()
    }

    /// Check if the DAG is empty
    pub fn is_empty(&self) -> bool {
        self.graph.node_count() == 0
    }

    /// Get the workflow ID
    pub fn workflow_id(&self) -> Uuid {
        self.workflow_id
    }

    /// Get edges from a node
    pub fn get_outgoing_edges(&self, node_id: Uuid) -> Vec<(Uuid, &WorkflowEdge)> {
        let Some(idx) = self.node_indices.get(&node_id) else {
            return Vec::new();
        };

        self.graph
            .edges(*idx)
            .filter_map(|edge| {
                let target_node = self.graph.node_weight(edge.target())?;
                Some((target_node.id, edge.weight()))
            })
            .collect()
    }

    /// Get edges to a node
    pub fn get_incoming_edges(&self, node_id: Uuid) -> Vec<(Uuid, &WorkflowEdge)> {
        todo!("Implement incoming edges query")
    }
}

impl Default for WorkflowDag {
    fn default() -> Self {
        Self::new()
    }
}

/// DAG-related errors
#[derive(Debug, thiserror::Error)]
pub enum DagError {
    #[error("Cycle detected in DAG")]
    CycleDetected,

    #[error("Node not found: {0}")]
    NodeNotFound(Uuid),

    #[error("Edge not found from {0} to {1}")]
    EdgeNotFound(Uuid, Uuid),

    #[error("Invalid edge: {0}")]
    InvalidEdge(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

/// Builder for creating workflow nodes
pub struct NodeBuilder {
    id: Uuid,
    node_type: String,
    name: String,
    config: serde_json::Value,
    inputs: Vec<NodeInput>,
    outputs: Vec<NodeOutput>,
    position: Position,
}

impl NodeBuilder {
    /// Create a new node builder
    pub fn new(node_type: &str, name: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            node_type: node_type.to_string(),
            name: name.to_string(),
            config: serde_json::Value::Object(Default::default()),
            inputs: Vec::new(),
            outputs: Vec::new(),
            position: Position::default(),
        }
    }

    /// Set the node ID
    pub fn id(mut self, id: Uuid) -> Self {
        self.id = id;
        self
    }

    /// Add an input port
    pub fn input(mut self, name: &str, dtype: &str, required: bool) -> Self {
        self.inputs.push(NodeInput {
            name: name.to_string(),
            dtype: dtype.to_string(),
            required,
            default: None,
        });
        self
    }

    /// Add an output port
    pub fn output(mut self, name: &str, dtype: &str) -> Self {
        self.outputs.push(NodeOutput {
            name: name.to_string(),
            dtype: dtype.to_string(),
        });
        self
    }

    /// Set the configuration
    pub fn config(mut self, config: serde_json::Value) -> Self {
        self.config = config;
        self
    }

    /// Set the position
    pub fn position(mut self, x: f64, y: f64) -> Self {
        self.position = Position { x, y };
        self
    }

    /// Build the node
    pub fn build(self) -> WorkflowNode {
        WorkflowNode {
            id: self.id,
            node_type: self.node_type,
            name: self.name,
            config: self.config,
            inputs: self.inputs,
            outputs: self.outputs,
            position: self.position,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dag_creation() {
        let dag = WorkflowDag::new();
        assert!(dag.is_empty());
    }

    #[test]
    fn test_add_node() {
        let mut dag = WorkflowDag::new();
        let node = NodeBuilder::new("test.node", "Test Node")
            .input("in", "string", true)
            .output("out", "string")
            .build();

        let id = node.id;
        dag.add_node(node);

        assert_eq!(dag.node_count(), 1);
        assert!(dag.get_node(id).is_some());
    }

    #[test]
    fn test_add_edge() {
        let mut dag = WorkflowDag::new();

        let node1 = NodeBuilder::new("test.input", "Input")
            .output("out", "string")
            .build();
        let node2 = NodeBuilder::new("test.output", "Output")
            .input("in", "string", true)
            .build();

        let id1 = node1.id;
        let id2 = node2.id;

        dag.add_node(node1);
        dag.add_node(node2);

        let edge = WorkflowEdge {
            source_output: "out".to_string(),
            target_input: "in".to_string(),
            transform: None,
        };

        dag.add_edge(id1, id2, edge).unwrap();
        assert_eq!(dag.edge_count(), 1);
    }

    #[test]
    fn test_get_dependencies() {
        let mut dag = WorkflowDag::new();

        let node1 = NodeBuilder::new("test.a", "A").build();
        let node2 = NodeBuilder::new("test.b", "B").build();

        let id1 = node1.id;
        let id2 = node2.id;

        dag.add_node(node1);
        dag.add_node(node2);

        dag.add_edge(id1, id2, WorkflowEdge {
            source_output: "out".to_string(),
            target_input: "in".to_string(),
            transform: None,
        }).unwrap();

        let deps = dag.get_dependencies(id2);
        assert_eq!(deps.len(), 1);
        assert_eq!(deps[0], id1);
    }
}
