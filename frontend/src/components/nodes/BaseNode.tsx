import { memo, ReactNode } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

/**
 * Node data interface with index signature for compatibility
 */
export interface BaseNodeData {
  [key: string]: unknown
  label: string
  nodeType: string
  description?: string
  config?: Record<string, unknown>
  inputs?: Array<{ name: string; dtype: string }>
  outputs?: Array<{ name: string; dtype: string }>
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
}

/**
 * Handle style variants for different positions
 */
const handleBaseClass = `
  !w-3 !h-3 !bg-white !border-2 !border-slate-300
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
function BaseNodeComponent({
  data,
  selected,
  icon,
  color = 'slate',
  children,
}: BaseNodeComponentProps) {
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
      className={`
        min-w-[180px] rounded-lg border-2 bg-white shadow-md
        ${selected ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200'}
        transition-all duration-150
      `}
    >
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
      <div className={`px-3 py-2 rounded-t-lg ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center gap-2">
          {icon && <span className={`text-lg ${colors.text}`}>{icon}</span>}
          <span className="font-medium text-sm text-slate-800">{data.label}</span>
        </div>
        {data.description && (
          <div className="text-xs text-slate-500 mt-0.5">{data.description}</div>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {children || (
          <div className="text-xs text-slate-400">
            {data.nodeType}
          </div>
        )}
      </div>
    </div>
  )
}

export const BaseNode = memo(BaseNodeComponent)
export type { NodeProps }
export default BaseNode
