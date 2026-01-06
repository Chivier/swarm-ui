import { create } from 'zustand'

/**
 * Execution status types
 */
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Individual node execution state
 */
export interface NodeExecution {
  nodeId: string
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed'
  progress: number
  error?: string
  startedAt?: Date
  completedAt?: Date
  outputs?: Record<string, unknown>
}

/**
 * Log entry
 */
export interface LogEntry {
  timestamp: Date
  message: string
  level: 'info' | 'warn' | 'error' | 'debug'
  nodeId?: string
}

/**
 * Execution store state and actions
 */
export interface ExecutionState {
  // State
  status: ExecutionStatus
  executionId: string | null
  workflowId: string | null
  nodeExecutions: Map<string, NodeExecution>
  logs: LogEntry[]
  startedAt: Date | null
  completedAt: Date | null
  progress: number

  // Actions
  startExecution: (executionId: string, workflowId: string, nodeIds: string[]) => void
  updateNodeStatus: (nodeId: string, update: Partial<NodeExecution>) => void
  completeExecution: () => void
  failExecution: (error: string) => void
  cancelExecution: () => void
  addLog: (message: string, level: LogEntry['level'], nodeId?: string) => void
  reset: () => void
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  // Initial state
  status: 'idle',
  executionId: null,
  workflowId: null,
  nodeExecutions: new Map(),
  logs: [],
  startedAt: null,
  completedAt: null,
  progress: 0,

  // Start a new execution
  startExecution: (executionId, workflowId, nodeIds) => {
    const nodeExecutions = new Map<string, NodeExecution>()
    nodeIds.forEach((nodeId) => {
      nodeExecutions.set(nodeId, {
        nodeId,
        status: 'pending',
        progress: 0,
      })
    })

    set({
      status: 'running',
      executionId,
      workflowId,
      nodeExecutions,
      logs: [],
      startedAt: new Date(),
      completedAt: null,
      progress: 0,
    })

    get().addLog(`Execution started: ${executionId}`, 'info')
  },

  // Update node status
  updateNodeStatus: (nodeId, update) => {
    const nodeExecutions = new Map(get().nodeExecutions)
    const current = nodeExecutions.get(nodeId)

    if (current) {
      nodeExecutions.set(nodeId, { ...current, ...update })

      // Calculate overall progress
      let totalProgress = 0
      nodeExecutions.forEach((node) => {
        if (node.status === 'completed') {
          totalProgress += 1
        } else if (node.status === 'running') {
          totalProgress += node.progress
        }
      })
      const progress = totalProgress / nodeExecutions.size

      set({ nodeExecutions, progress })

      // Log status changes
      if (update.status) {
        get().addLog(`Node ${nodeId}: ${update.status}`, 'info', nodeId)
      }
      if (update.error) {
        get().addLog(`Node ${nodeId} error: ${update.error}`, 'error', nodeId)
      }
    }
  },

  // Mark execution as completed
  completeExecution: () => {
    set({
      status: 'completed',
      completedAt: new Date(),
      progress: 1,
    })
    get().addLog('Execution completed successfully', 'info')
  },

  // Mark execution as failed
  failExecution: (error) => {
    set({
      status: 'failed',
      completedAt: new Date(),
    })
    get().addLog(`Execution failed: ${error}`, 'error')
  },

  // Cancel execution
  cancelExecution: () => {
    set({
      status: 'cancelled',
      completedAt: new Date(),
    })
    get().addLog('Execution cancelled by user', 'warn')
  },

  // Add a log entry
  addLog: (message, level, nodeId) => {
    set({
      logs: [
        ...get().logs,
        {
          timestamp: new Date(),
          message,
          level,
          nodeId,
        },
      ],
    })
  },

  // Reset to initial state
  reset: () => {
    set({
      status: 'idle',
      executionId: null,
      workflowId: null,
      nodeExecutions: new Map(),
      logs: [],
      startedAt: null,
      completedAt: null,
      progress: 0,
    })
  },
}))
