import { useState, useEffect, useCallback, useMemo } from 'react'
import { Node } from '@xyflow/react'
import { useFlowStore } from '../../stores'
import { BaseNodeData } from '../nodes/BaseNode'

interface NodeConfigModalProps {
  node: Node | null
  isOpen: boolean
  onClose: () => void
}

/**
 * Config field schema type with category
 */
type ConfigField = {
  name: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean' | 'env_var'
  label: string
  options?: string[]
  placeholder?: string
  category: 'node' | 'foldable' | 'edit_only'  // Display category
}

/**
 * Get config field schema based on node type
 */
function getConfigSchema(nodeType: string): ConfigField[] {
  const schemas: Record<string, ConfigField[]> = {
    'ai.openai.chat': [
      { name: 'model', type: 'select', label: 'Model', options: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'], category: 'node' },
      { name: 'prompt', type: 'textarea', label: 'Prompt', placeholder: 'Enter prompt or use ${input0}, ${input1}...', category: 'node' },
      { name: 'temperature', type: 'number', label: 'Temperature', placeholder: '0.7', category: 'foldable' },
      { name: 'max_tokens', type: 'number', label: 'Max Tokens', placeholder: '1000', category: 'foldable' },
      { name: 'api_key', type: 'env_var', label: 'API Key', placeholder: '${ENV.OPENAI_API_KEY}', category: 'edit_only' },
    ],
    'ai.openai.compatible': [
      { name: 'base_url', type: 'text', label: 'Base URL', placeholder: 'https://api.example.com/v1', category: 'node' },
      { name: 'model', type: 'text', label: 'Model', placeholder: 'model-name', category: 'node' },
      { name: 'prompt', type: 'textarea', label: 'Prompt', placeholder: 'Enter prompt or use ${input0}, ${input1}...', category: 'node' },
      { name: 'temperature', type: 'number', label: 'Temperature', placeholder: '0.7', category: 'foldable' },
      { name: 'api_key', type: 'env_var', label: 'API Key', placeholder: '${ENV.API_KEY}', category: 'edit_only' },
    ],
    'flow.ai_branch': [
      { name: 'condition', type: 'textarea', label: 'Condition', placeholder: 'Describe the condition for AI to evaluate...', category: 'node' },
      { name: 'model', type: 'select', label: 'Model', options: ['gpt-4', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo'], category: 'foldable' },
      { name: 'true_description', type: 'text', label: 'True Branch', placeholder: 'When condition is true...', category: 'foldable' },
      { name: 'false_description', type: 'text', label: 'False Branch', placeholder: 'When condition is false...', category: 'foldable' },
      { name: 'api_key', type: 'env_var', label: 'API Key', placeholder: '${ENV.OPENAI_API_KEY}', category: 'edit_only' },
    ],
    'http.request': [
      { name: 'method', type: 'select', label: 'Method', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], category: 'node' },
      { name: 'url', type: 'text', label: 'URL', placeholder: 'https://api.example.com', category: 'node' },
      { name: 'headers', type: 'textarea', label: 'Headers (JSON)', placeholder: '{"Authorization": "Bearer ${ENV.TOKEN}"}', category: 'foldable' },
      { name: 'body', type: 'textarea', label: 'Body', placeholder: 'Request body or ${input0}', category: 'foldable' },
    ],
    'code.python': [
      { name: 'code', type: 'textarea', label: 'Python Code', placeholder: '# Python code here', category: 'node' },
    ],
    'trigger.schedule': [
      { name: 'cron', type: 'text', label: 'Cron Expression', placeholder: '0 * * * *', category: 'node' },
      { name: 'timezone', type: 'text', label: 'Timezone', placeholder: 'UTC', category: 'foldable' },
    ],
  }
  return schemas[nodeType] || []
}

/**
 * NodeConfigModal - n8n-style modal with Input | Properties | Output layout
 */
export function NodeConfigModal({ node, isOpen, onClose }: NodeConfigModalProps) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData)
  const edges = useFlowStore((state) => state.edges)
  const nodes = useFlowStore((state) => state.nodes)
  const envVariables = useFlowStore((state) => state.envVariables)

  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Undo/Redo history
  const [configHistory, setConfigHistory] = useState<Record<string, unknown>[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Get node data
  const data = node?.data as BaseNodeData | undefined

  // Calculate incoming connections (inputs)
  const incomingConnections = useMemo(() => {
    if (!node) return []
    return edges
      .filter((e) => e.target === node.id)
      .map((e, idx) => {
        const sourceNode = nodes.find((n) => n.id === e.source)
        const sourceData = sourceNode?.data as BaseNodeData | undefined
        return {
          index: idx,
          sourceId: e.source,
          sourceHandle: e.sourceHandle || 'output',
          targetHandle: e.targetHandle || 'input',
          sourceName: sourceData?.name || sourceData?.label || e.source,
          variable: `\${input${idx}}`,
        }
      })
  }, [node, edges, nodes])

  // Calculate outgoing connections (outputs)
  const outgoingConnections = useMemo(() => {
    if (!node) return []
    return edges
      .filter((e) => e.source === node.id)
      .map((e) => {
        const targetNode = nodes.find((n) => n.id === e.target)
        const targetData = targetNode?.data as BaseNodeData | undefined
        return {
          targetId: e.target,
          sourceHandle: e.sourceHandle || 'output',
          targetHandle: e.targetHandle || 'input',
          targetName: targetData?.name || targetData?.label || e.target,
        }
      })
  }, [node, edges, nodes])

  // Sync local state when node changes
  useEffect(() => {
    if (data) {
      setName(data.name || data.label || '')
      const initialConfig = data.config || {}
      setConfig(initialConfig)
      // Initialize history with current config
      setConfigHistory([initialConfig])
      setHistoryIndex(0)
    }
  }, [data, node?.id])

  const handleSave = useCallback(() => {
    if (node) {
      updateNodeData(node.id, { name, config })
    }
    onClose()
  }, [node, name, config, updateNodeData, onClose])

  const handleCopyVariable = useCallback(async (variable: string, index: number) => {
    await navigator.clipboard.writeText(variable)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }, [])

  // Handle drag start for input variables
  const handleInputDragStart = useCallback((e: React.DragEvent, variable: string) => {
    e.dataTransfer.setData('text/plain', variable)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleConfigChange = useCallback((fieldName: string, value: unknown) => {
    setConfig(prev => {
      const newConfig = { ...prev, [fieldName]: value }
      // Add to history (truncate future history if we're not at the end)
      setConfigHistory(history => {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(newConfig)
        // Limit history to 50 entries
        if (newHistory.length > 50) newHistory.shift()
        return newHistory
      })
      setHistoryIndex(idx => Math.min(idx + 1, 49))
      return newConfig
    })
  }, [historyIndex])

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setConfig(configHistory[newIndex])
    }
  }, [historyIndex, configHistory])

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < configHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setConfig(configHistory[newIndex])
    }
  }, [historyIndex, configHistory])

  // Keyboard shortcuts: Escape to close, Ctrl+Z to undo, Ctrl+Shift+Z or Ctrl+Y to redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && isOpen) {
        e.preventDefault()
        handleUndo()
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y (or Cmd+Shift+Z / Cmd+Y on Mac)
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y') && isOpen) {
        e.preventDefault()
        handleRedo()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleUndo, handleRedo])

  if (!isOpen || !node || !data) return null

  const configSchema = getConfigSchema(data.nodeType)
  const apiKeyEnvVars = envVariables.filter(
    (v) => v.key.includes('API_KEY') || v.key.includes('KEY') || v.key.includes('TOKEN')
  )

  // Render a config field
  const renderField = (field: ConfigField) => {
    const value = config[field.name]

    if (field.type === 'env_var') {
      return (
        <div key={field.name} className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            {field.label}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => handleConfigChange(field.name, e.target.value)}
              className="flex-1 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder={field.placeholder}
            />
            {apiKeyEnvVars.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleConfigChange(field.name, `\${ENV.${e.target.value}}`)
                  }
                }}
                className="px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                value=""
              >
                <option value="">Select env var</option>
                {apiKeyEnvVars.map((v) => (
                  <option key={v.key} value={v.key}>{v.key}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )
    }

    if (field.type === 'select') {
      return (
        <div key={field.name}>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {field.label}
          </label>
          <select
            value={(value as string) || ''}
            onChange={(e) => handleConfigChange(field.name, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    }

    if (field.type === 'textarea') {
      const textValue = (value as string) || ''
      // Highlight variables like ${input0}, ${ENV.XXX}
      const highlightedHtml = textValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/(\$\{[^}]+\})/g, '<span class="text-emerald-600 bg-emerald-100 rounded-sm">$1</span>')
        .replace(/\n/g, '<br/>') + (textValue.endsWith('\n') ? '<br/>' : '')

      return (
        <div key={field.name}>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {field.label}
          </label>
          <div
            className="relative bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-transparent transition-all"
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('ring-2', 'ring-emerald-400')
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('ring-2', 'ring-emerald-400')
            }}
          >
            {/* Highlighted text layer (behind) */}
            <div
              className="absolute top-0 left-0 right-0 px-3 py-2 text-sm font-mono whitespace-pre-wrap break-words text-slate-800 pointer-events-none overflow-hidden"
              style={{ minHeight: '7rem' }}
              aria-hidden="true"
            >
              {textValue ? (
                <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
              ) : (
                <span className="text-slate-400">{field.placeholder}</span>
              )}
            </div>
            {/* Actual textarea (on top, transparent text) */}
            <textarea
              value={textValue}
              onChange={(e) => handleConfigChange(field.name, e.target.value)}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.parentElement?.classList.remove('ring-2', 'ring-emerald-400')
                const droppedText = e.dataTransfer.getData('text/plain')
                if (droppedText) {
                  const textarea = e.currentTarget
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const newValue = textValue.substring(0, start) + droppedText + textValue.substring(end)
                  handleConfigChange(field.name, newValue)
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + droppedText.length
                    textarea.focus()
                  }, 0)
                }
              }}
              onScroll={(e) => {
                // Sync scroll with the highlight layer
                const target = e.currentTarget
                const highlightDiv = target.previousElementSibling as HTMLElement
                if (highlightDiv) {
                  highlightDiv.scrollTop = target.scrollTop
                }
              }}
              className="relative w-full px-3 py-2 text-sm font-mono bg-transparent border-0 rounded-lg focus:outline-none h-28 resize-none"
              style={{ color: 'transparent', caretColor: '#1e293b' }}
            />
          </div>
        </div>
      )
    }

    if (field.type === 'number') {
      return (
        <div key={field.name}>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {field.label}
          </label>
          <input
            type="number"
            step="0.1"
            value={(value as number) ?? ''}
            onChange={(e) => handleConfigChange(field.name, e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder={field.placeholder}
          />
        </div>
      )
    }

    return (
      <div key={field.name}>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          {field.label}
        </label>
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => handleConfigChange(field.name, e.target.value)}
          onDragOver={(e) => {
            e.preventDefault()
            e.currentTarget.classList.add('ring-2', 'ring-sky-400')
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('ring-2', 'ring-sky-400')
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.classList.remove('ring-2', 'ring-sky-400')
            const droppedText = e.dataTransfer.getData('text/plain')
            if (droppedText) {
              const input = e.currentTarget
              const start = input.selectionStart || 0
              const end = input.selectionEnd || 0
              const currentValue = (value as string) || ''
              const newValue = currentValue.substring(0, start) + droppedText + currentValue.substring(end)
              handleConfigChange(field.name, newValue)
            }
          }}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
          placeholder={field.placeholder}
        />
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-lg shadow-xl w-[900px] max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
              {data.label}
            </h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {data.nodeType}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1"
            aria-label="Close modal (Escape)"
          >
            &times;
          </button>
        </div>

        {/* Main Content - 3 column layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Inputs */}
          <div className="w-56 border-r border-slate-200 bg-slate-50 p-4 overflow-auto">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Inputs
            </h3>
            {incomingConnections.length > 0 ? (
              <div className="space-y-2">
                {incomingConnections.map((conn) => (
                  <div
                    key={`${conn.sourceId}-${conn.index}`}
                    className="bg-white p-2 rounded-lg border border-slate-200 text-xs cursor-grab active:cursor-grabbing hover:border-emerald-400 hover:shadow-sm transition-all"
                    draggable
                    onDragStart={(e) => handleInputDragStart(e, conn.variable)}
                    title="Drag to prompt field or click Copy"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-slate-700 truncate">
                        {conn.sourceName}
                      </span>
                      <button
                        onClick={() => handleCopyVariable(conn.variable, conn.index)}
                        className="text-emerald-500 hover:text-emerald-600 text-[10px] font-medium"
                        title="Copy variable"
                      >
                        {copiedIndex === conn.index ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <code className="block text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200 select-all">
                      {conn.variable}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No incoming connections</p>
            )}

            <div className="mt-4 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-[10px] text-emerald-700">
                Drag input to any text field, or click Copy.
                Use <code className="bg-emerald-100 px-1 rounded border border-emerald-200 text-emerald-700">{`\${input0}`}</code> to reference data.
              </p>
            </div>
          </div>

          {/* Center Panel - Properties */}
          <div className="flex-1 p-4 overflow-auto">
            {/* Node name */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Node Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Enter node name"
              />
            </div>

            {/* Main config fields (node category) */}
            {configSchema.filter(f => f.category === 'node').length > 0 && (
              <div className="space-y-3 mb-4">
                {configSchema.filter(f => f.category === 'node').map(renderField)}
              </div>
            )}

            {/* Foldable fields */}
            {configSchema.filter(f => f.category === 'foldable').length > 0 && (
              <details className="mb-4">
                <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 mb-2">
                  Advanced Options
                </summary>
                <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                  {configSchema.filter(f => f.category === 'foldable').map(renderField)}
                </div>
              </details>
            )}

            {/* Edit-only fields (API keys, credentials) */}
            {configSchema.filter(f => f.category === 'edit_only').length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-medium text-slate-500">Credentials</h4>
                {configSchema.filter(f => f.category === 'edit_only').map(renderField)}
              </div>
            )}

            {/* UUID and Version info */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex gap-4 text-xs text-slate-400">
                <div>
                  <span className="font-medium">UUID:</span>{' '}
                  <code className="bg-slate-100 px-1 rounded">{data.uuid || 'N/A'}</code>
                </div>
                <div>
                  <span className="font-medium">Version:</span> {data.version || '1'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Outputs */}
          <div className="w-56 border-l border-slate-200 bg-slate-50 p-4 overflow-auto">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Outputs
            </h3>
            {outgoingConnections.length > 0 ? (
              <div className="space-y-2">
                {outgoingConnections.map((conn, idx) => (
                  <div
                    key={`${conn.targetId}-${idx}`}
                    className="bg-white p-2 rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="font-medium text-slate-700 truncate">
                      {conn.targetName}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {conn.sourceHandle} → {conn.targetHandle}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No outgoing connections</p>
            )}

            <div className="mt-4 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-[10px] text-emerald-600">
                Output data will be available as <code className="bg-emerald-100 px-1 rounded">{`\${inputN}`}</code> in connected nodes.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default NodeConfigModal
