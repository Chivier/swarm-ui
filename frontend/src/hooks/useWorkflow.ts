import { useCallback } from 'react'
import { Node, Edge } from '@xyflow/react'
import { useFlowStore, useExecutionStore } from '../stores'
import { useApi } from './useApi'

/**
 * Workflow definition from API
 */
interface WorkflowDefinition {
  id: string
  name: string
  version: number
  nodes: WorkflowNodeDef[]
  edges: WorkflowEdgeDef[]
}

interface WorkflowNodeDef {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

interface WorkflowEdgeDef {
  source: string
  source_output: string
  target: string
  target_input: string
}

/**
 * Execution response from API
 */
interface ExecutionResponse {
  execution_id: string
  workflow_id: string
  status: string
}

/**
 * Hook for workflow operations
 *
 * Provides functions for loading, saving, and executing workflows
 */
export function useWorkflow() {
  const flowStore = useFlowStore()
  const executionStore = useExecutionStore()
  const api = useApi<WorkflowDefinition>()
  const execApi = useApi<ExecutionResponse>()

  /**
   * Load a workflow from the API
   */
  const loadWorkflow = useCallback(
    async (workflowId: string) => {
      const data = await api.get(`/api/workflows/${workflowId}`)

      if (data) {
        // Transform API response to React Flow nodes/edges
        const nodes: Node[] = data.nodes.map((n) => ({
          id: n.id,
          type: 'default', // TODO: Map to custom node types
          position: n.position,
          data: {
            label: n.name,
            nodeType: n.type,
            config: n.config,
          },
        }))

        const edges: Edge[] = data.edges.map((e, i) => ({
          id: `e-${i}`,
          source: e.source,
          target: e.target,
          sourceHandle: e.source_output,
          targetHandle: e.target_input,
          type: 'smoothstep',
          animated: true,
        }))

        flowStore.loadWorkflow(data.id, data.name, nodes, edges)
      }
    },
    [api, flowStore]
  )

  /**
   * Save the current workflow to the API
   */
  const saveWorkflow = useCallback(async () => {
    const { nodes, edges, workflowId, workflowName } = flowStore

    // Transform React Flow nodes/edges to API format
    const workflowNodes: WorkflowNodeDef[] = nodes.map((n) => ({
      id: n.id,
      type: String(n.data?.nodeType || n.type),
      name: String(n.data?.label || n.id),
      config: (n.data?.config as Record<string, unknown>) || {},
      position: n.position,
    }))

    const workflowEdges: WorkflowEdgeDef[] = edges.map((e) => ({
      source: e.source,
      source_output: e.sourceHandle || 'output',
      target: e.target,
      target_input: e.targetHandle || 'input',
    }))

    const payload = {
      id: workflowId,
      name: workflowName,
      version: 1,
      nodes: workflowNodes,
      edges: workflowEdges,
    }

    if (workflowId) {
      // Update existing workflow
      await api.put(`/api/workflows/${workflowId}`, payload)
    } else {
      // Create new workflow
      const result = await api.post('/api/workflows', payload)
      if (result) {
        flowStore.loadWorkflow(result.id, result.name, nodes, edges)
      }
    }
  }, [api, flowStore])

  /**
   * Execute the current workflow
   */
  const executeWorkflow = useCallback(async () => {
    const { workflowId, nodes } = flowStore

    if (!workflowId) {
      console.error('No workflow loaded')
      return
    }

    // Reset execution state
    executionStore.reset()

    // Call execute API
    const result = await execApi.post(`/api/workflows/${workflowId}/execute`)

    if (result) {
      // Start execution tracking
      executionStore.startExecution(
        result.execution_id,
        result.workflow_id,
        nodes.map((n) => n.id)
      )

      // TODO: Set up polling or WebSocket for status updates
    }
  }, [flowStore, executionStore, execApi])

  /**
   * Create a new workflow
   */
  const newWorkflow = useCallback(() => {
    flowStore.clearWorkflow()
    executionStore.reset()
  }, [flowStore, executionStore])

  return {
    loadWorkflow,
    saveWorkflow,
    executeWorkflow,
    newWorkflow,
    loading: api.loading || execApi.loading,
    error: api.error || execApi.error,
  }
}
