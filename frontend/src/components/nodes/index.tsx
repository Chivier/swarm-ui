import { memo, useCallback } from 'react'
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
 */
const OpenAINodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="🤖" color="violet">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">Model:</span>
          <span className="text-xs font-mono text-violet-600">
            {(data.config?.model as string) || 'gpt-4'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
}
export const OpenAINode = memo(OpenAINodeComponent)

/**
 * OpenAI Compatible Node - For custom OpenAI-compatible endpoints
 */
const OpenAICompatibleNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="🔌" color="violet">
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">Endpoint:</span>
          <span className="text-xs font-mono text-violet-600 truncate max-w-[120px]">
            {(data.config?.base_url as string) || 'custom'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">Model:</span>
          <span className="text-xs font-mono text-violet-600">
            {(data.config?.model as string) || 'default'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
}
export const OpenAICompatibleNode = memo(OpenAICompatibleNodeComponent)

/**
 * Python Code Node - With inline code editor
 */
const PythonNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  const updateNodeData = useFlowStore((state) => state.updateNodeData)
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

  return (
    <BaseNode data={data} selected={props.selected} icon="🐍" color="emerald">
      <div className="space-y-2 min-w-[200px]">
        <div className="text-xs text-slate-500">
          {lineCount} lines
        </div>
        <div className="relative nodrag">
          <textarea
            value={code}
            onChange={handleCodeChange}
            className="w-full h-32 text-xs font-mono bg-slate-900 text-emerald-400 p-2 rounded border border-slate-700 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="# Python code here&#10;&#10;def execute(inputs):&#10;    return {'output': inputs}"
            spellCheck={false}
          />
        </div>
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
    <BaseNode data={data} selected={props.selected} icon="💻" color="emerald">
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
    <BaseNode data={data} selected={props.selected} icon="🔀" color="amber">
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
    <BaseNode data={data} selected={props.selected} icon="🌐" color="cyan">
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
    <BaseNode data={data} selected={props.selected} icon="⚡" color="rose">
      <div className="text-xs text-slate-500">
        Workflow trigger
      </div>
    </BaseNode>
  )
}
export const TriggerNode = memo(TriggerNodeComponent)

/**
 * Core Node - For Input/Output nodes
 */
const CoreNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  return (
    <BaseNode data={data} selected={props.selected} icon="⚙️" color="slate">
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
    <BaseNode data={data} selected={props.selected} icon="📁" color="sky">
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
    <BaseNode data={data} selected={props.selected} icon="📦" color="slate">
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
  'flow.loop': FlowNode,
  'flow.merge': FlowNode,
  'flow.switch': FlowNode,
  'flow.parallel': FlowNode,

  // HTTP nodes
  'http.request': HTTPNode,

  // Trigger nodes
  'trigger.manual': TriggerNode,
  'trigger.webhook': TriggerNode,
  'trigger.schedule': TriggerNode,

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
