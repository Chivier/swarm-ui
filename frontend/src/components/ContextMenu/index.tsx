import { useFlowStore } from '../../stores'

interface ContextMenuProps {
  x: number
  y: number
  type: 'node' | 'edge'
  targetId: string
  onClose: () => void
}

/**
 * ContextMenu - Right-click context menu for nodes and edges
 *
 * Features:
 * - Appears at cursor position on right-click
 * - Delete action for nodes and edges
 * - Closes on click outside or Escape key
 */
export function ContextMenu({ x, y, type, targetId, onClose }: ContextMenuProps) {
  const { removeNode, removeEdge } = useFlowStore()

  const handleDelete = () => {
    if (type === 'node') {
      removeNode(targetId)
    } else {
      removeEdge(targetId)
    }
    onClose()
  }

  // Adjust position to keep menu within viewport
  const adjustedX = Math.min(x, window.innerWidth - 150)
  const adjustedY = Math.min(y, window.innerHeight - 60)

  return (
    <div
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        zIndex: 1000,
      }}
      className="min-w-[120px] bg-white border border-slate-200 rounded-lg shadow-md py-1"
    >
      <button
        onClick={handleDelete}
        className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete
      </button>
    </div>
  )
}

export default ContextMenu
