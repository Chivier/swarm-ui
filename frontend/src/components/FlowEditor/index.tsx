import { useCallback, useRef, useState, useEffect, DragEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionLineType,
  MarkerType,
  Node,
  Edge,
  useReactFlow,
} from '@xyflow/react'
import { useFlowStore } from '../../stores'
import { useKeyboardShortcuts } from '../../hooks'
import { nodeTypes, getNodeTypeKey } from '../nodes'
import { EditableEdge } from '../edges'
import { ContextMenu } from '../ContextMenu'

// Custom edge types
const edgeTypes = {
  editable: EditableEdge,
}

interface ContextMenuState {
  x: number
  y: number
  type: 'node' | 'edge'
  targetId: string
}

/**
 * Node label mapping for display
 */
const NODE_LABELS: Record<string, string> = {
  'ai.openai.chat': 'OpenAI',
  'ai.openai.compatible': 'OpenAI Compatible',
  'code.python': 'Python',
  'code.shell': 'Shell',
  'code.javascript': 'JavaScript',
  'flow.if': 'IF',
  'flow.loop': 'Loop',
  'flow.merge': 'Merge',
  'flow.switch': 'Switch',
  'flow.parallel': 'Parallel',
  'http.request': 'HTTP Request',
  'trigger.manual': 'Manual',
  'trigger.webhook': 'Webhook',
  'trigger.schedule': 'Schedule',
  'core.input': 'Input',
  'core.output': 'Output',
  'file.read': 'Read File',
  'file.write': 'Write File',
}

/**
 * FlowEditor - Main workflow canvas using React Flow
 *
 * Features:
 * - Drag and drop nodes from palette
 * - Connect nodes with edges (4-directional handles)
 * - Pan and zoom
 * - Mini map for navigation
 */
export function FlowEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    setConfigModalNode,
    addNode,
  } = useFlowStore()

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  // Close context menu on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && contextMenu) {
        setContextMenu(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [contextMenu])

  // Close context menu callback
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
    },
    [setSelectedNode]
  )

  // Handle pane click (deselect and close context menu)
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
    setContextMenu(null)
  }, [setSelectedNode])

  // Handle right-click on node
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'node',
        targetId: node.id,
      })
    },
    []
  )

  // Handle right-click on edge
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'edge',
        targetId: edge.id,
      })
    },
    []
  )

  // Handle double-click on node to open config modal
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setConfigModalNode(node)
    },
    [setConfigModalNode]
  )

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

      // Get drop position in flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // Get the appropriate custom node type
      const customNodeType = getNodeTypeKey(nodeType)

      // Get display label for the node
      const displayLabel = NODE_LABELS[nodeType] || nodeType.split('.').pop() || nodeType

      // Create new node with custom type
      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: customNodeType,
        position,
        data: {
          label: displayLabel,
          nodeType,
          uuid: uuidv4(),
          name: `${displayLabel}-v1`,
          version: '1',
          description: getNodeDescription(nodeType),
          config: getDefaultConfig(nodeType),
        },
      }

      addNode(newNode)
    },
    [addNode, screenToFlowPosition]
  )

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'editable',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#64748b',
          },
        }}
        connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
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
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          targetId={contextMenu.targetId}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}

/**
 * Get description for a node type
 */
function getNodeDescription(nodeType: string): string {
  const descriptions: Record<string, string> = {
    'ai.openai.chat': 'GPT models (gpt-4, gpt-3.5-turbo)',
    'ai.openai.compatible': 'Custom OpenAI-compatible endpoint',
    'code.python': 'Python script',
    'flow.if': 'Conditional branch',
    'flow.loop': 'Iterate array',
    'flow.merge': 'Merge branches',
    'http.request': 'HTTP request',
    'trigger.manual': 'Manual trigger',
    'trigger.webhook': 'HTTP trigger',
    'core.input': 'Workflow input',
    'core.output': 'Workflow output',
    'file.read': 'Read file',
    'file.write': 'Write file',
  }
  return descriptions[nodeType] || ''
}

/**
 * Get default config for a node type
 */
function getDefaultConfig(nodeType: string): Record<string, unknown> {
  const configs: Record<string, Record<string, unknown>> = {
    'ai.openai.chat': { model: 'gpt-4', temperature: 0.7, api_key: '' },
    'ai.openai.compatible': { base_url: '', model: '', temperature: 0.7, api_key: '' },
    'http.request': { method: 'GET', url: '' },
    'code.python': { code: '# Python code here\n\ndef execute(inputs):\n    return {"output": inputs}' },
    'trigger.schedule': { cron: '0 * * * *', timezone: 'UTC' },
  }
  return configs[nodeType] || {}
}

export default FlowEditor
