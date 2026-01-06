import { memo, useCallback, useState } from 'react'
import { NodeProps } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './BaseNode'
import { useFlowStore } from '../../stores'
import { parseCronToHuman } from '../../utils/cron'

/**
 * Get API key related environment variables
 */
function useApiKeyEnvVars() {
  const envVariables = useFlowStore((state) => state.envVariables)
  return envVariables.filter(
    (v) => v.key.includes('API_KEY') || v.key.includes('KEY') || v.key.includes('TOKEN')
  )
}

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
 * n8n/dify style: inline input fields with env var support
 */
const OpenAINodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  const updateNodeData = useFlowStore((state) => state.updateNodeData)
  const apiKeyEnvVars = useApiKeyEnvVars()

  // Default to ${ENV.OPENAI_API_KEY} if not set
  const apiKeyValue = (data.config?.api_key as string) || '${ENV.OPENAI_API_KEY}'
  const modelValue = (data.config?.model as string) || 'gpt-4'
  const promptValue = (data.config?.prompt as string) || ''

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      updateNodeData(props.id, {
        config: {
          ...data.config,
          [field]: value,
        },
      })
    },
    [props.id, data.config, updateNodeData]
  )

  // Quick select env var for API key
  const handleEnvVarSelect = useCallback(
    (key: string) => {
      handleFieldChange('api_key', `\${ENV.${key}}`)
    },
    [handleFieldChange]
  )

  return (
    <BaseNode data={data} selected={props.selected} icon="🤖" color="violet" nodeId={props.id}>
      <div className="space-y-2 min-w-[200px]">
        {/* API Key field with env var suggestions */}
        <div className="nodrag">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">API Key</span>
            {apiKeyEnvVars.length > 0 && (
              <div className="flex gap-1">
                {apiKeyEnvVars.slice(0, 2).map((v) => (
                  <button
                    key={v.key}
                    onClick={() => handleEnvVarSelect(v.key)}
                    className="text-[10px] px-1 py-0.5 bg-violet-100 text-violet-600 rounded hover:bg-violet-200"
                    title={`Use ${v.key}`}
                  >
                    {v.key.replace('_API_KEY', '').replace('_KEY', '')}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={apiKeyValue}
            onChange={(e) => handleFieldChange('api_key', e.target.value)}
            placeholder="${ENV.OPENAI_API_KEY}"
            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
          />
        </div>

        {/* Model field */}
        <div className="nodrag">
          <span className="text-xs text-slate-500 block mb-1">Model</span>
          <select
            value={modelValue}
            onChange={(e) => handleFieldChange('model', e.target.value)}
            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="gpt-4">gpt-4</option>
            <option value="gpt-4-turbo">gpt-4-turbo</option>
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          </select>
        </div>

        {/* Prompt field */}
        <div className="nodrag">
          <span className="text-xs text-slate-500 block mb-1">Prompt</span>
          <textarea
            value={promptValue}
            onChange={(e) => handleFieldChange('prompt', e.target.value)}
            placeholder="Enter prompt or use ${input.field}..."
            className="w-full h-16 text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
          />
        </div>
      </div>
    </BaseNode>
  )
}
export const OpenAINode = memo(OpenAINodeComponent)

/**
 * OpenAI Compatible Node - For custom OpenAI-compatible endpoints
 * n8n/dify style: inline input fields with env var support
 */
const OpenAICompatibleNodeComponent = (props: NodeProps) => {
  const data = getNodeData(props)
  const updateNodeData = useFlowStore((state) => state.updateNodeData)
  const apiKeyEnvVars = useApiKeyEnvVars()

  const apiKeyValue = (data.config?.api_key as string) || '${ENV.OPENAI_API_KEY}'
  const baseUrlValue = (data.config?.base_url as string) || ''
  const modelValue = (data.config?.model as string) || ''
  const promptValue = (data.config?.prompt as string) || ''

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      updateNodeData(props.id, {
        config: {
          ...data.config,
          [field]: value,
        },
      })
    },
    [props.id, data.config, updateNodeData]
  )

  const handleEnvVarSelect = useCallback(
    (key: string) => {
      handleFieldChange('api_key', `\${ENV.${key}}`)
    },
    [handleFieldChange]
  )

  return (
    <BaseNode data={data} selected={props.selected} icon="🔌" color="violet" nodeId={props.id}>
      <div className="space-y-2 min-w-[200px]">
        {/* Base URL field */}
        <div className="nodrag">
          <span className="text-xs text-slate-500 block mb-1">Base URL</span>
          <input
            type="text"
            value={baseUrlValue}
            onChange={(e) => handleFieldChange('base_url', e.target.value)}
            placeholder="https://api.example.com/v1"
            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
          />
        </div>

        {/* API Key field */}
        <div className="nodrag">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">API Key</span>
            {apiKeyEnvVars.length > 0 && (
              <div className="flex gap-1">
                {apiKeyEnvVars.slice(0, 2).map((v) => (
                  <button
                    key={v.key}
                    onClick={() => handleEnvVarSelect(v.key)}
                    className="text-[10px] px-1 py-0.5 bg-violet-100 text-violet-600 rounded hover:bg-violet-200"
                    title={`Use ${v.key}`}
                  >
                    {v.key.replace('_API_KEY', '').replace('_KEY', '')}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={apiKeyValue}
            onChange={(e) => handleFieldChange('api_key', e.target.value)}
            placeholder="${ENV.API_KEY}"
            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
          />
        </div>

        {/* Model field */}
        <div className="nodrag">
          <span className="text-xs text-slate-500 block mb-1">Model</span>
          <input
            type="text"
            value={modelValue}
            onChange={(e) => handleFieldChange('model', e.target.value)}
            placeholder="model-name"
            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
          />
        </div>

        {/* Prompt field */}
        <div className="nodrag">
          <span className="text-xs text-slate-500 block mb-1">Prompt</span>
          <textarea
            value={promptValue}
            onChange={(e) => handleFieldChange('prompt', e.target.value)}
            placeholder="Enter prompt or use ${input.field}..."
            className="w-full h-16 text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
          />
        </div>
      </div>
    </BaseNode>
  )
}
export const OpenAICompatibleNode = memo(OpenAICompatibleNodeComponent)

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
