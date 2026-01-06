import { memo } from 'react'
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react'

interface EdgeData {
  label?: string
  color?: string
  lineStyle?: 'solid' | 'dashed' | 'animated'
}

/**
 * EditableEdge - Custom edge with label support and styling options
 */
function EditableEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data || {}) as EdgeData
  const color = selected ? '#0ea5e9' : (edgeData.color || '#64748b')
  const lineStyle = edgeData.lineStyle || 'solid'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  // Calculate stroke properties based on line style
  const strokeDasharray = lineStyle === 'dashed' ? '5,5' : undefined
  const strokeWidth = selected ? 3 : 2

  // Animation style for animated edges
  const animationStyle = lineStyle === 'animated' ? {
    strokeDasharray: '5,5',
    animation: 'edge-dash 0.5s linear infinite',
  } : {}

  return (
    <>
      {/* Interactive hit area (invisible, wider for easier selection) */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />

      {/* Visible edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        style={animationStyle}
        className="react-flow__edge-path"
        markerEnd={markerEnd}
      />

      {/* Edge label */}
      {edgeData.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-white px-1.5 py-0.5 rounded text-xs border border-slate-200 shadow-sm"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* CSS animation for animated edges */}
      <style>{`
        @keyframes edge-dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </>
  )
}

export const EditableEdge = memo(EditableEdgeComponent)
export default EditableEdge
