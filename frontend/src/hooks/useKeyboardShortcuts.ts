import { useEffect, useCallback } from 'react'
import { Node } from '@xyflow/react'
import { v4 as uuidv4 } from 'uuid'
import { useFlowStore } from '../stores'

interface CopiedNode {
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

// Module-level clipboard to persist across re-renders
let clipboard: CopiedNode | null = null

/**
 * Hook for keyboard shortcuts in the workflow editor
 *
 * Shortcuts:
 * - Delete/Backspace: Remove selected node
 * - Enter: Open config modal for selected node
 * - Escape: Close context menu or modal
 * - Cmd/Ctrl+C: Copy selected node
 * - Cmd/Ctrl+V: Paste copied node
 */
export function useKeyboardShortcuts() {
  const {
    selectedNode,
    removeNode,
    setConfigModalNode,
    configModalNode,
    addNode,
  } = useFlowStore()

  const copyNode = useCallback(() => {
    if (selectedNode) {
      clipboard = {
        type: selectedNode.type || 'default',
        position: { ...selectedNode.position },
        data: { ...(selectedNode.data as Record<string, unknown>) },
      }
    }
  }, [selectedNode])

  const pasteNode = useCallback(() => {
    if (clipboard) {
      const newNode: Node = {
        id: `${clipboard.type}-${Date.now()}`,
        type: clipboard.type,
        position: {
          x: clipboard.position.x + 50,
          y: clipboard.position.y + 50,
        },
        data: {
          ...clipboard.data,
          uuid: uuidv4(),
          name: `${clipboard.data.name || clipboard.data.label}-copy`,
        },
      }
      addNode(newNode)
      // Update clipboard position for subsequent pastes
      clipboard = {
        ...clipboard,
        position: newNode.position,
      }
    }
  }, [addNode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedNode) {
            e.preventDefault()
            removeNode(selectedNode.id)
          }
          break

        case 'Enter':
          if (selectedNode && !isMod) {
            e.preventDefault()
            setConfigModalNode(selectedNode)
          }
          break

        case 'Escape':
          if (configModalNode) {
            e.preventDefault()
            setConfigModalNode(null)
          }
          break

        case 'c':
          if (isMod && selectedNode) {
            e.preventDefault()
            copyNode()
          }
          break

        case 'v':
          if (isMod && clipboard) {
            e.preventDefault()
            pasteNode()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, configModalNode, removeNode, setConfigModalNode, copyNode, pasteNode])

  return {
    hasClipboard: !!clipboard,
    copyNode,
    pasteNode,
  }
}

export default useKeyboardShortcuts
