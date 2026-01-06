import { create } from 'zustand'
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  MarkerType,
} from '@xyflow/react'

/**
 * Flow store state and actions for managing the workflow DAG
 */
export interface FlowState {
  // State
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  configModalNode: Node | null  // Node being edited in config modal
  workflowId: string | null
  workflowName: string
  isDirty: boolean

  // React Flow event handlers
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect

  // Actions
  addNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  removeEdge: (edgeId: string) => void
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
  updateEdgeData: (edgeId: string, data: Record<string, unknown>) => void
  setSelectedNode: (node: Node | null) => void
  setConfigModalNode: (node: Node | null) => void  // Open/close config modal
  loadWorkflow: (id: string, name: string, nodes: Node[], edges: Edge[]) => void
  clearWorkflow: () => void
  setWorkflowName: (name: string) => void
}

export const useFlowStore = create<FlowState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNode: null,
  configModalNode: null,
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isDirty: false,

  // React Flow change handlers
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    })
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    })
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'editable',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#64748b',
          },
        },
        get().edges
      ),
      isDirty: true,
    })
  },

  // Node management
  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      isDirty: true,
    })
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNode:
        get().selectedNode?.id === nodeId ? null : get().selectedNode,
      isDirty: true,
    })
  },

  removeEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      isDirty: true,
    })
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    })
  },

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e
      ),
      isDirty: true,
    })
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node })
  },

  setConfigModalNode: (node) => {
    set({ configModalNode: node })
  },

  // Workflow management
  loadWorkflow: (id, name, nodes, edges) => {
    set({
      workflowId: id,
      workflowName: name,
      nodes,
      edges,
      selectedNode: null,
      isDirty: false,
    })
  },

  clearWorkflow: () => {
    set({
      workflowId: null,
      workflowName: 'Untitled Workflow',
      nodes: [],
      edges: [],
      selectedNode: null,
      isDirty: false,
    })
  },

  setWorkflowName: (name) => {
    set({
      workflowName: name,
      isDirty: true,
    })
  },
}))
