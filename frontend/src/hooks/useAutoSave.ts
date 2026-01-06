import { useEffect, useCallback, useState, useRef } from 'react'
import { useFlowStore } from '../stores'
import {
  serializeWorkflow,
  saveToLocalStorage,
  loadFromLocalStorage,
  getAutoSaveTimestamp,
  hasAutoSave,
  clearAutoSave,
  deserializeWorkflow,
} from '../utils/workflowFile'

/**
 * Auto-save interval in milliseconds (15 minutes)
 */
const AUTOSAVE_INTERVAL = 15 * 60 * 1000

/**
 * Hook for auto-save functionality
 *
 * Features:
 * - Auto-saves to localStorage every 15 minutes when dirty
 * - Prompts to recover auto-saved workflow on startup
 * - Provides manual save trigger
 */
export function useAutoSave() {
  const flowStore = useFlowStore()
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)
  const [hasRecovery, setHasRecovery] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check for recovery on mount
  useEffect(() => {
    if (hasAutoSave()) {
      setHasRecovery(true)
    }
  }, [])

  // Auto-save function
  const autoSave = useCallback(() => {
    const { nodes, edges, workflowId, workflowName, envVariables, isDirty } = flowStore

    // Only save if there are nodes and workflow is dirty
    if (nodes.length === 0 || !isDirty) {
      return
    }

    const workflow = serializeWorkflow(nodes, edges, {
      id: workflowId || undefined,
      name: workflowName,
      envVariables,
    })

    saveToLocalStorage(workflow)
    setLastAutoSave(new Date())
  }, [flowStore])

  // Set up auto-save interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      autoSave()
    }, AUTOSAVE_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoSave])

  // Recover auto-saved workflow
  const recoverAutoSave = useCallback(() => {
    const workflow = loadFromLocalStorage()
    if (!workflow) {
      setHasRecovery(false)
      return false
    }

    const { nodes, edges, envVariables } = deserializeWorkflow(workflow)
    flowStore.loadWorkflow(workflow.id, workflow.name, nodes, edges, envVariables)
    setHasRecovery(false)
    clearAutoSave()
    return true
  }, [flowStore])

  // Dismiss recovery prompt
  const dismissRecovery = useCallback(() => {
    clearAutoSave()
    setHasRecovery(false)
  }, [])

  // Get recovery timestamp
  const getRecoveryTimestamp = useCallback(() => {
    return getAutoSaveTimestamp()
  }, [])

  // Manual trigger for auto-save
  const triggerAutoSave = useCallback(() => {
    autoSave()
  }, [autoSave])

  return {
    lastAutoSave,
    hasRecovery,
    recoverAutoSave,
    dismissRecovery,
    getRecoveryTimestamp,
    triggerAutoSave,
  }
}
