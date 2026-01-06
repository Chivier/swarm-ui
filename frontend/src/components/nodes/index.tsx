import { memo, useCallback, useState } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './BaseNode'
import { useFlowStore } from '../../stores'
import { parseCronToHuman } from '../../utils/cron'

/**
 * Helper to safely cast node data
 */
function getNodeData(props: NodeProps): BaseNodeData {
  const data = props.data as BaseNodeData
  return {
    label: data.label || 'Unknown',
    nodeType: data.nodeType || 'unknown',
    uuid: data.uuid || '',
    name: data.name || data.label || 'Unknown',
    version: data.version || '1',
    description: data.description,
    config: data.config,
    inputs: data.inputs,
    outputs: data.outputs,
  }
}

/**
 * OpenAI Node - For OpenAI GPT models
 * Shows only essential info on node, detailed config in edit modal
 */
const OpenAINodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  const modelValue = (data.config?.model as string) || 'gpt-4'
  const promptValue = (data.config?.prompt as string) || ''

  // Truncate prompt for preview
  const promptPreview = promptValue.length > 40
    ? promptValue.substring(0, 40) + '...'
    : promptValue || 'No prompt set'

  return (
    <BaseNode data={data} selected={props.selected} icon="🤖" color="violet" nodeId={props.id}>
      <div className="space-y-1 min-w-[140px]">
        {/* Model - always visible */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">Model:</span>
          <span className="text-xs font-mono text-violet-600">{modelValue}</span>
        </div>
        {/* Prompt preview */}
        <div className="text-xs text-slate-400 truncate" title={promptValue}>
          {promptPreview}
        </div>
      </div>
    </BaseNode>
  )
}
export const OpenAINode = memo(OpenAINodeComponent)

/**
 * OpenAI Compatible Node - For custom OpenAI-compatible endpoints
 * Shows only essential info on node, detailed config in edit modal
 */
const OpenAICompatibleNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  const baseUrlValue = (data.config?.base_url as string) || ''
  const modelValue = (data.config?.model as string) || ''

  // Truncate URL for preview
  const urlPreview = baseUrlValue
    ? (baseUrlValue.length > 25 ? baseUrlValue.substring(0, 25) + '...' : baseUrlValue)
    : 'Not configured'

  return (
    <BaseNode data={data} selected={props.selected} icon="🔌" color="violet" nodeId={props.id}>
      <div className="space-y-1 min-w-[140px]">
        {/* Endpoint preview */}
        <div className="text-xs text-slate-400 truncate" title={baseUrlValue}>
          {urlPreview}
        </div>
        {/* Model - if set */}
        {modelValue && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">Model:</span>
            <span className="text-xs font-mono text-violet-600">{modelValue}</span>
          </div>
        )}
      </div>
    </BaseNode>
  )
}
export const OpenAICompatibleNode = memo(OpenAICompatibleNodeComponent)

/**
 * AI Flow Node - AI-powered conditional branching
 * Uses AI to decide which branch to take based on input
 */
const AIFlowNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  const condition = (data.config?.condition as string) || ''

  const conditionPreview = condition.length > 30
    ? condition.substring(0, 30) + '...'
    : condition || 'Configure condition...'

  return (
    <BaseNode data={data} selected={props.selected} icon="🧠" color="amber" nodeId={props.id}>
      <div className="space-y-1 min-w-[140px]">
        <div className="text-xs text-amber-600 font-medium">AI Branch</div>
        <div className="text-xs text-slate-400 truncate" title={condition}>
          {conditionPreview}
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded">True</span>
          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded">False</span>
        </div>
      </div>
    </BaseNode>
  )
}
export const AIFlowNode = memo(AIFlowNodeComponent)

/**
 * Python Code Node - Foldable with inline code editor
 * Double-click to expand/collapse the code editor
 */
const PythonNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  const updateNodeData = useFlowStore((state) => state.updateNodeData)
  const [isExpanded, setIsExpanded] = useState(false)
  const code = (data.config?.code as string) || ''
  const lineCount = code.split('\n').length

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newCode = e.target.value
      updateNodeData(props.id, {
        config: {
          ...data.config,
          code: newCode,
        },
      })
    },
    [props.id, data.config, updateNodeData]
  )

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
  }, [])

  // Get first line of code for preview
  const firstLine = code.split('\n')[0] || '# Empty'
  const previewText = firstLine.length > 25 ? firstLine.substring(0, 25) + '...' : firstLine

  return (
    <BaseNode data={data} selected={props.selected} icon="🐍" color="emerald" nodeId={props.id}>
      <div
        className={`space-y-2 transition-all duration-200 ${isExpanded ? 'min-w-[280px]' : 'min-w-[140px]'}`}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {lineCount} lines
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded) }}
            className="text-xs text-emerald-600 hover:text-emerald-700 nodrag px-1"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {isExpanded ? (
          <div className="relative nodrag">
            <textarea
              value={code}
              onChange={handleCodeChange}
              className="w-full h-40 text-xs font-mono bg-slate-900 text-emerald-400 p-2 rounded border border-slate-700 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="# Python code here&#10;&#10;def execute(inputs):&#10;    return {'output': inputs}"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded truncate">
            {previewText}
          </div>
        )}
      </div>
    </BaseNode>
  )
}
export const PythonNode = memo(PythonNodeComponent)

/**
 * Code Node - For JavaScript, Shell scripts (generic)
 */
const CodeNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="💻" color="emerald" nodeId={props.id}>
      <div className="text-xs text-slate-500">
        Script execution
      </div>
    </BaseNode>
  )
}
export const CodeNode = memo(CodeNodeComponent)

/**
 * Flow Node - For control flow (IF, Loop, Merge)
 */
const FlowNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="🔀" color="amber" nodeId={props.id}>
      <div className="text-xs text-slate-500">
        Control flow
      </div>
    </BaseNode>
  )
}
export const FlowNode = memo(FlowNodeComponent)

/**
 * HTTP Node - For HTTP requests
 */
const HTTPNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="🌐" color="cyan" nodeId={props.id}>
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono px-1 bg-cyan-100 text-cyan-700 rounded">
            {(data.config?.method as string) || 'GET'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
}
export const HTTPNode = memo(HTTPNodeComponent)

/**
 * Trigger Node - For workflow triggers
 */
const TriggerNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="⚡" color="rose" nodeId={props.id}>
      <div className="text-xs text-slate-500">
        Workflow trigger
      </div>
    </BaseNode>
  )
}
export const TriggerNode = memo(TriggerNodeComponent)

/**
 * Schedule Trigger Node - Cron-based scheduled trigger
 */
const ScheduleTriggerNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  const cronExpression = (data.config?.cron as string) || '0 * * * *'
  const scheduleDescription = parseCronToHuman(cronExpression)

  return (
    <BaseNode data={data} selected={props.selected} icon="🕐" color="rose" nodeId={props.id}>
      <div className="space-y-1">
        <div className="text-xs font-mono bg-slate-100 px-1 rounded">
          {cronExpression}
        </div>
        <div className="text-xs text-slate-500">
          {scheduleDescription}
        </div>
      </div>
    </BaseNode>
  )
}
export const ScheduleTriggerNode = memo(ScheduleTriggerNodeComponent)

/**
 * Core Node - For Input/Output nodes
 */
const CoreNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="⚙️" color="slate" nodeId={props.id}>
      <div className="text-xs text-slate-500">
        {data.nodeType === 'core.input' ? 'Workflow input' : 'Workflow output'}
      </div>
    </BaseNode>
  )
}
export const CoreNode = memo(CoreNodeComponent)

/**
 * File Node - For file operations
 */
const FileNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="📁" color="sky" nodeId={props.id}>
      <div className="text-xs text-slate-500">
        File operation
      </div>
    </BaseNode>
  )
}
export const FileNode = memo(FileNodeComponent)

/**
 * Default Node - Fallback for unknown types
 */
const DefaultNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="📦" color="slate" nodeId={props.id}>
      <div className="text-xs text-slate-400">
        Unknown node type
      </div>
    </BaseNode>
  )
}
export const DefaultNode = memo(DefaultNodeComponent)

/**
 * Node type registry - maps node type prefixes to components
 */
export const nodeTypes = {
  // AI nodes (OpenAI and OpenAI Compatible only)
  'ai.openai.chat': OpenAINode,
  'ai.openai.compatible': OpenAICompatibleNode,

  // Code nodes
  'code.python': PythonNode,
  'code.shell': CodeNode,
  'code.javascript': CodeNode,

  // Flow nodes
  'flow.if': FlowNode,
  'flow.ai_branch': AIFlowNode,  // AI-powered conditional branching
  'flow.loop': FlowNode,
  'flow.merge': FlowNode,
  'flow.switch': FlowNode,
  'flow.parallel': FlowNode,

  // HTTP nodes
  'http.request': HTTPNode,

  // Trigger nodes
  'trigger.manual': TriggerNode,
  'trigger.webhook': TriggerNode,
  'trigger.schedule': ScheduleTriggerNode,

  // Core nodes
  'core.input': CoreNode,
  'core.output': CoreNode,

  // File nodes
  'file.read': FileNode,
  'file.write': FileNode,

  // Default fallback
  'default': DefaultNode,
}

/**
 * Get the appropriate node type key for a given node type string
 */
export function getNodeTypeKey(nodeType: string): string {
  // Check for exact match first
  if (nodeType in nodeTypes) {
    return nodeType
  }

  // Check for prefix match
  const prefix = nodeType.split('.').slice(0, 2).join('.')
  if (prefix in nodeTypes) {
    return prefix
  }

  // Fallback to default
  return 'default'
}

export { BaseNode } from './BaseNode'
export type { BaseNodeData } from './BaseNode'
