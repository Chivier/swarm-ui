import { useState, useCallback, useEffect } from 'react'
import { useFlowStore } from '../../stores'

/**
 * Common environment variable presets
 */
const ENV_PRESETS = [
  { key: 'OPENAI_API_KEY', description: 'OpenAI API Key', isSecret: true },
  { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API Key', isSecret: true },
  { key: 'DEEPSEEK_API_KEY', description: 'DeepSeek API Key', isSecret: true },
  { key: 'BASE_URL', description: 'Custom API Base URL', isSecret: false },
]

/**
 * EnvVariablesModal - Modal for managing workflow environment variables
 */
export function EnvVariablesModal() {
  const {
    envVariables,
    envModalOpen,
    setEnvModalOpen,
    addEnvVariable,
    updateEnvVariable,
    removeEnvVariable,
  } = useFlowStore()

  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newIsSecret, setNewIsSecret] = useState(true)
  const [showValues, setShowValues] = useState<Set<string>>(new Set())

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && envModalOpen) {
        setEnvModalOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [envModalOpen, setEnvModalOpen])

  const handleAddVariable = useCallback(() => {
    if (!newKey.trim()) return

    addEnvVariable({
      key: newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      value: newValue,
      description: newDescription,
      isSecret: newIsSecret,
    })

    setNewKey('')
    setNewValue('')
    setNewDescription('')
    setNewIsSecret(true)
  }, [newKey, newValue, newDescription, newIsSecret, addEnvVariable])

  const handleAddPreset = useCallback((preset: typeof ENV_PRESETS[0]) => {
    const exists = envVariables.some(v => v.key === preset.key)
    if (!exists) {
      addEnvVariable({
        key: preset.key,
        value: '',
        description: preset.description,
        isSecret: preset.isSecret,
      })
    }
  }, [envVariables, addEnvVariable])

  const toggleShowValue = useCallback((key: string) => {
    setShowValues(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleUpdateValue = useCallback((key: string, value: string) => {
    updateEnvVariable(key, { value })
  }, [updateEnvVariable])

  if (!envModalOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="env-modal-title"
        className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 id="env-modal-title" className="text-lg font-semibold text-slate-900">
              Environment Variables
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Use <code className="bg-slate-100 px-1 rounded">{'${ENV.KEY_NAME}'}</code> in node configurations
            </p>
          </div>
          <button
            onClick={() => setEnvModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Presets */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="text-xs font-medium text-slate-500 mb-2">Quick Add:</div>
          <div className="flex flex-wrap gap-2">
            {ENV_PRESETS.map((preset) => {
              const exists = envVariables.some(v => v.key === preset.key)
              return (
                <button
                  key={preset.key}
                  onClick={() => handleAddPreset(preset)}
                  disabled={exists}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    exists
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-sky-500 hover:text-sky-600'
                  }`}
                >
                  {preset.key}
                </button>
              )
            })}
          </div>
        </div>

        {/* Variables List */}
        <div className="flex-1 overflow-auto p-4">
          {envVariables.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">🔐</div>
              <p>No environment variables configured</p>
              <p className="text-sm mt-1">Add variables to store API keys and other secrets</p>
            </div>
          ) : (
            <div className="space-y-3">
              {envVariables.map((variable) => (
                <div
                  key={variable.key}
                  className="border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                          {variable.key}
                        </code>
                        {variable.isSecret && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            Secret
                          </span>
                        )}
                      </div>
                      {variable.description && (
                        <div className="text-xs text-slate-500 mt-1">{variable.description}</div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type={variable.isSecret && !showValues.has(variable.key) ? 'password' : 'text'}
                          value={variable.value}
                          onChange={(e) => handleUpdateValue(variable.key, e.target.value)}
                          placeholder="Enter value..."
                          className="flex-1 text-sm px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono"
                        />
                        {variable.isSecret && (
                          <button
                            onClick={() => toggleShowValue(variable.key)}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                          >
                            {showValues.has(variable.key) ? 'Hide' : 'Show'}
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeEnvVariable(variable.key)}
                      className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                      aria-label={`Delete ${variable.key}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Variable */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="text-xs font-medium text-slate-500 mb-2">Add Custom Variable:</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              placeholder="KEY_NAME"
              className="w-32 text-sm px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono"
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value"
              className="flex-1 text-sm px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-40 text-sm px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={newIsSecret}
                onChange={(e) => setNewIsSecret(e.target.checked)}
                className="rounded border-slate-300"
              />
              Secret
            </label>
            <button
              onClick={handleAddVariable}
              disabled={!newKey.trim()}
              className="px-3 py-1.5 text-sm text-white bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <button
            onClick={() => setEnvModalOpen(false)}
            className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnvVariablesModal
