import { memo, useMemo } from 'react'
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from '@xyflow/react'

interface EdgeData {
  label?: string
  color?: string
  lineStyle?: 'solid' | 'dashed' | 'animated'
  edgeIndex?: number  // Index for offset calculation when multiple edges between same nodes
}

/**
 * EditableEdge - Custom edge with dashed style and smart routing
 */
function EditableEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = (data || {}) as EdgeData
  const color = selected ? '#0ea5e9' : (edgeData.color || '#64748b')
  // Default to dashed style
  const lineStyle = edgeData.lineStyle || 'dashed'

  // Calculate offset based on handle IDs and edge index to avoid overlapping
  const offset = useMemo(() => {
    // Base offset based on source/target handle combination
    const handleOffset = {
      'top-top': 0,
      'top-bottom': 0,
      'top-left': -15,
      'top-right': 15,
      'bottom-top': 0,
      'bottom-bottom': 0,
      'bottom-left': -15,
      'bottom-right': 15,
      'left-top': -15,
      'left-bottom': -15,
      'left-left': 0,
      'left-right': 0,
      'right-top': 15,
      'right-bottom': 15,
      'right-left': 0,
      'right-right': 0,
    }
    const key = `${sourceHandleId || 'bottom'}-${targetHandleId || 'top'}` as keyof typeof handleOffset
    const baseOffset = handleOffset[key] || 0

    // Add additional offset for multiple edges between same nodes
    const indexOffset = (edgeData.edgeIndex || 0) * 20

    return baseOffset + indexOffset
  }, [sourceHandleId, targetHandleId, edgeData.edgeIndex])

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
    offset,
  })

  // Calculate stroke properties - default is dashed
  const strokeDasharray = lineStyle === 'solid' ? undefined : '6,4'
  const strokeWidth = selected ? 2.5 : 1.5

  // Animation style for animated edges
  const animationStyle = lineStyle === 'animated' ? {
    strokeDasharray: '6,4',
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
