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
 * Environment variable definition
 */
export interface EnvVariable {
  key: string
  value: string
  description?: string
  isSecret?: boolean  // If true, value is masked in UI
}

/**
 * Flow store state and actions for managing the workflow DAG
 */
export interface FlowState {
  // State
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  configModalNode: Node | null  // Node being edited in config modal
  envVariables: EnvVariable[]   // Workflow environment variables
  envModalOpen: boolean         // Environment variables modal state
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

  // Environment variables actions
  setEnvModalOpen: (open: boolean) => void
  addEnvVariable: (variable: EnvVariable) => void
  updateEnvVariable: (key: string, variable: Partial<EnvVariable>) => void
  removeEnvVariable: (key: string) => void
  setEnvVariables: (variables: EnvVariable[]) => void
  getEnvValue: (key: string) => string | undefined

  // Workflow management
  loadWorkflow: (id: string, name: string, nodes: Node[], edges: Edge[], envVariables?: EnvVariable[]) => void
  clearWorkflow: () => void
  setWorkflowName: (name: string) => void
}

export const useFlowStore = create<FlowState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNode: null,
  configModalNode: null,
  envVariables: [],
  envModalOpen: false,
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
    const currentEdges = get().edges

    // Count existing edges between the same pair of nodes (for offset calculation)
    const existingEdgesBetweenNodes = currentEdges.filter(
      (e) =>
        (e.source === connection.source && e.target === connection.target) ||
        (e.source === connection.target && e.target === connection.source)
    ).length

    set({
      edges: addEdge(
        {
          ...connection,
          type: 'editable',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: '#64748b',
          },
          data: {
            edgeIndex: existingEdgesBetweenNodes,
          },
        },
        currentEdges
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

  // Environment variables management
  setEnvModalOpen: (open) => {
    set({ envModalOpen: open })
  },

  addEnvVariable: (variable) => {
    const existing = get().envVariables.find((v) => v.key === variable.key)
    if (existing) {
      // Update if key already exists
      set({
        envVariables: get().envVariables.map((v) =>
          v.key === variable.key ? { ...v, ...variable } : v
        ),
        isDirty: true,
      })
    } else {
      set({
        envVariables: [...get().envVariables, variable],
        isDirty: true,
      })
    }
  },

  updateEnvVariable: (key, variable) => {
    set({
      envVariables: get().envVariables.map((v) =>
        v.key === key ? { ...v, ...variable } : v
      ),
      isDirty: true,
    })
  },

  removeEnvVariable: (key) => {
    set({
      envVariables: get().envVariables.filter((v) => v.key !== key),
      isDirty: true,
    })
  },

  setEnvVariables: (variables) => {
    set({
      envVariables: variables,
      isDirty: true,
    })
  },

  getEnvValue: (key) => {
    const variable = get().envVariables.find((v) => v.key === key)
    return variable?.value
  },

  // Workflow management
  loadWorkflow: (id, name, nodes, edges, envVariables = []) => {
    // Ensure all edges have the proper marker and type
    const processedEdges = edges.map((edge) => ({
      ...edge,
      type: edge.type || 'editable',
      markerEnd: edge.markerEnd || {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: '#64748b',
      },
    }))

    set({
      workflowId: id,
      workflowName: name,
      nodes,
      edges: processedEdges,
      envVariables,
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
      envVariables: [],
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
