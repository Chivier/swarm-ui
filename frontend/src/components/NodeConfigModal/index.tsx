import { useState, useEffect, useCallback } from 'react'
import { Node } from '@xyflow/react'
import { useFlowStore } from '../../stores'
import { BaseNodeData } from '../nodes/BaseNode'

type TabType = 'settings' | 'input' | 'output'

interface NodeConfigModalProps {
  node: Node | null
  isOpen: boolean
  onClose: () => void
}

/**
 * Config field schema type
 */
type ConfigField = {
  name: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean'
  label: string
  options?: string[]
  placeholder?: string
}

/**
 * Get config field schema based on node type
 */
function getConfigSchema(nodeType: string): ConfigField[] {
  const schemas: Record<string, ConfigField[]> = {
    'ai.openai.chat': [
      { name: 'model', type: 'select', label: 'Model', options: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
      { name: 'temperature', type: 'number', label: 'Temperature', placeholder: '0.7' },
      { name: 'api_key', type: 'text', label: 'API Key', placeholder: 'sk-...' },
    ],
    'ai.openai.compatible': [
      { name: 'base_url', type: 'text', label: 'Base URL', placeholder: 'https://api.example.com/v1' },
      { name: 'model', type: 'text', label: 'Model', placeholder: 'model-name' },
      { name: 'temperature', type: 'number', label: 'Temperature', placeholder: '0.7' },
      { name: 'api_key', type: 'text', label: 'API Key', placeholder: 'sk-...' },
    ],
    'http.request': [
      { name: 'method', type: 'select', label: 'Method', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      { name: 'url', type: 'text', label: 'URL', placeholder: 'https://api.example.com' },
    ],
    'code.python': [
      { name: 'code', type: 'textarea', label: 'Python Code', placeholder: '# Python code here' },
    ],
    'trigger.schedule': [
      { name: 'cron', type: 'text', label: 'Cron Expression', placeholder: '0 * * * *' },
      { name: 'timezone', type: 'text', label: 'Timezone', placeholder: 'UTC' },
    ],
  }
  return schemas[nodeType] || []
}

/**
 * NodeConfigModal - Modal dialog for node configuration
 */
export function NodeConfigModal({ node, isOpen, onClose }: NodeConfigModalProps) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData)
  const [activeTab, setActiveTab] = useState<TabType>('settings')
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [copied, setCopied] = useState(false)

  // Get node data
  const data = node?.data as BaseNodeData | undefined

  // Sync local state when node changes
  useEffect(() => {
    if (data) {
      setName(data.name || data.label || '')
      setConfig(data.config || {})
    }
    setActiveTab('settings')
  }, [data, node?.id])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSave = useCallback(() => {
    if (node) {
      updateNodeData(node.id, { name, config })
    }
    onClose()
  }, [node, name, config, updateNodeData, onClose])

  const handleCopyUuid = useCallback(async () => {
    if (data?.uuid) {
      await navigator.clipboard.writeText(data.uuid)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [data?.uuid])

  const handleConfigChange = useCallback((fieldName: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [fieldName]: value }))
  }, [])

  if (!isOpen || !node || !data) return null

  const configSchema = getConfigSchema(data.nodeType)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
            {data.label} Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1"
            aria-label="Close modal (Escape)"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 flex" role="tablist" aria-label="Node configuration tabs">
          {(['settings', 'input', 'output'] as TabType[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-sky-600 border-b-2 border-sky-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'settings' && (
            <div className="space-y-4">
              {/* Node Name */}
              <div>
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

              {/* UUID (read-only) */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  UUID
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 text-xs font-mono text-slate-500 bg-slate-50 rounded-lg border border-slate-200 select-all">
                    {data.uuid || 'N/A'}
                  </div>
                  <button
                    onClick={handleCopyUuid}
                    className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Version (read-only) */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Version
                </label>
                <div className="px-3 py-2 text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  {data.version || '1'}
                </div>
              </div>

              {/* Node Type (read-only) */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Type
                </label>
                <div className="px-3 py-2 text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  {data.nodeType}
                </div>
              </div>

              {/* Dynamic config fields */}
              {configSchema.length > 0 && (
                <>
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">Configuration</h3>
                  </div>
                  {configSchema.map((field) => (
                    <div key={field.name}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={(config[field.name] as string) || ''}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={(config[field.name] as string) || ''}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent h-32 resize-y"
                          placeholder={field.placeholder}
                        />
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          step="0.1"
                          value={(config[field.name] as number) || ''}
                          onChange={(e) => handleConfigChange(field.name, parseFloat(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          type="text"
                          value={(config[field.name] as string) || ''}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'input' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Inputs</h3>
              {data.inputs && data.inputs.length > 0 ? (
                <div className="space-y-2">
                  {data.inputs.map((input, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">{input.name}</span>
                      <span className="text-xs text-slate-400">({input.dtype})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No inputs defined</p>
              )}
            </div>
          )}

          {activeTab === 'output' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Outputs</h3>
              {data.outputs && data.outputs.length > 0 ? (
                <div className="space-y-2">
                  {data.outputs.map((output, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">{output.name}</span>
                      <span className="text-xs text-slate-400">({output.dtype})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No outputs defined</p>
              )}
            </div>
          )}
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
