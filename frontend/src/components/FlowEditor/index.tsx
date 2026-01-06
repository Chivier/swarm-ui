import { useCallback, DragEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Node,
} from '@xyflow/react'
import { useFlowStore } from '../../stores'

// Custom node types will be registered here
const nodeTypes = {
  // TODO: Add custom node types
  // 'ai.openai.chat': OpenAINode,
  // 'code.python': PythonNode,
  // 'core.input': InputNode,
  // 'core.output': OutputNode,
}

/**
 * FlowEditor - Main workflow canvas using React Flow
 *
 * Features:
 * - Drag and drop nodes from palette
 * - Connect nodes with edges
 * - Pan and zoom
 * - Mini map for navigation
 */
export function FlowEditor() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    addNode,
  } = useFlowStore()

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
    },
    [setSelectedNode]
  )

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  // Handle drop from node palette
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType) return

      // Get drop position relative to the flow
      const reactFlowBounds = event.currentTarget.getBoundingClientRect()
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      }

      // Create new node
      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: 'default', // TODO: Use custom node type
        position,
        data: {
          label: nodeType.split('.').pop() || nodeType,
          nodeType,
        },
      }

      addNode(newNode)
    },
    [addNode]
  )

  return (
    <div className="h-full w-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-slate-100"
        />
      </ReactFlow>
    </div>
  )
}

export default FlowEditor
