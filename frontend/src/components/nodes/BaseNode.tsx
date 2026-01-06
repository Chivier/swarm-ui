import { memo, ReactNode, useState, useCallback } from 'react'
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react'
import { useFlowStore } from '../../stores'

/**
 * Node data interface with index signature for compatibility
 */
export interface BaseNodeData {
  [key: string]: unknown
  label: string
  nodeType: string
  uuid: string          // Non-editable unique identifier
  name: string          // Editable node name, displayed on node
  version: string       // Node version (e.g., '1', '1.0')
  description?: string
  config?: Record<string, unknown>
  inputs?: Array<{ name: string; dtype: string; value?: unknown }>
  outputs?: Array<{ name: string; dtype: string; value?: unknown }>
  executionData?: {
    inputs?: Record<string, unknown>
    outputs?: Record<string, unknown>
    timestamp?: Date
  }
}

/**
 * Props for the base node component
 */
interface BaseNodeComponentProps {
  data: BaseNodeData
  selected?: boolean
  icon?: ReactNode
  color?: string
  children?: ReactNode
  nodeId?: string  // For opening config modal
}

/**
 * Handle style variants for different positions
 */
const handleBaseClass = `
  !w-2 !h-2 !bg-white !border-2 !border-slate-300
  hover:!border-sky-500 hover:!bg-sky-50
  transition-colors duration-150
`

/**
 * BaseNode - Custom node with 4-directional connection handles
 *
 * Features:
 * - Handles on all 4 sides (top, right, bottom, left)
 * - Category-based color coding
 * - Icon and label display
 * - Selection state styling
 */
/**
 * Format JSON for display with truncation
 */
function formatJsonPreview(data: unknown, maxLength = 100): string {
  try {
    const json = JSON.stringify(data, null, 2)
    if (json.length > maxLength) {
      return json.substring(0, maxLength) + '...'
    }
    return json
  } catch {
    return String(data)
  }
}

function BaseNodeComponent({
  data,
  selected,
  icon,
  color = 'slate',
  children,
  nodeId,
}: BaseNodeComponentProps) {
  const [showInputs, setShowInputs] = useState(false)
  const [showOutputs, setShowOutputs] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const setConfigModalNode = useFlowStore((state) => state.setConfigModalNode)
  const nodes = useFlowStore((state) => state.nodes)

  const handleEditClick = useCallback(() => {
    if (nodeId) {
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        setConfigModalNode(node)
      }
    }
  }, [nodeId, nodes, setConfigModalNode])

  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
    sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-600' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600' },
  }

  const colors = colorClasses[color] || colorClasses.slate

  return (
    <div
      role="group"
      aria-label={`${data.nodeType} node: ${data.name || data.label}`}
      aria-selected={selected}
      className={`
        relative min-w-[140px] rounded-lg border bg-white shadow-sm
        ${selected ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200'}
        transition-all duration-150
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Node Resizer - only visible when selected */}
      <NodeResizer
        color="#0ea5e9"
        isVisible={selected}
        minWidth={140}
        minHeight={80}
        handleStyle={{ width: 8, height: 8 }}
      />
      {/* Edit Button - appears on hover or selection */}
      {(isHovered || selected) && nodeId && (
        <button
          onClick={handleEditClick}
          className="absolute -top-2 -right-2 w-6 h-6 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-md flex items-center justify-center text-xs z-10 nodrag nopan transition-colors"
          title="Edit configuration (Enter)"
          aria-label="Edit node configuration"
        >
          ✏️
        </button>
      )}

      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={handleBaseClass}
      />

      {/* Right Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleBaseClass}
      />

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleBaseClass}
      />

      {/* Left Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleBaseClass}
      />

      {/* Header */}
      <div className={`px-2 py-1.5 rounded-t-lg ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center gap-1.5">
          {icon && <span className={`text-sm ${colors.text}`}>{icon}</span>}
          <span className="font-medium text-xs text-slate-800 truncate">
            {data.name || data.label}
          </span>
        </div>
        {data.description && (
          <div className="text-xs text-slate-500 mt-0.5 truncate">{data.description}</div>
        )}
      </div>

      {/* Body */}
      <div className="px-2 py-1.5">
        {children || (
          <div className="text-xs text-slate-400">
            {data.nodeType}
          </div>
        )}
      </div>

      {/* Execution Data Preview */}
      {data.executionData && (
        <div className="border-t border-slate-200">
          <div className="px-2 py-1 flex justify-between text-xs">
            <button
              onClick={() => setShowInputs(!showInputs)}
              className="text-slate-500 hover:text-slate-700 nodrag"
              aria-expanded={showInputs}
              aria-label={`Toggle inputs view, ${Object.keys(data.executionData.inputs || {}).length} inputs`}
            >
              {showInputs ? '▼' : '▶'} {Object.keys(data.executionData.inputs || {}).length} inputs
            </button>
            <button
              onClick={() => setShowOutputs(!showOutputs)}
              className="text-slate-500 hover:text-slate-700 nodrag"
              aria-expanded={showOutputs}
              aria-label={`Toggle outputs view, ${Object.keys(data.executionData.outputs || {}).length} outputs`}
            >
              {showOutputs ? '▼' : '▶'} {Object.keys(data.executionData.outputs || {}).length} outputs
            </button>
          </div>
          {showInputs && data.executionData.inputs && (
            <div className="px-2 py-1 bg-slate-50 text-xs font-mono max-h-24 overflow-auto border-t border-slate-100 nodrag">
              <pre className="whitespace-pre-wrap break-all">
                {formatJsonPreview(data.executionData.inputs, 200)}
              </pre>
            </div>
          )}
          {showOutputs && data.executionData.outputs && (
            <div className="px-2 py-1 bg-emerald-50 text-xs font-mono max-h-24 overflow-auto border-t border-slate-100 nodrag">
              <pre className="whitespace-pre-wrap break-all">
                {formatJsonPreview(data.executionData.outputs, 200)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const BaseNode = memo(BaseNodeComponent)
export type { NodeProps }
export default BaseNode
