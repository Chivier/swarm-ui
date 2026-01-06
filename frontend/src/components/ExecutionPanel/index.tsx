import { useCallback, useState } from 'react'
import { useExecutionStore, useFlowStore } from '../../stores'
import { BaseNodeData } from '../nodes/BaseNode'

/**
 * ExecutionPanel - Right sidebar for execution control and monitoring
 *
 * Features:
 * - Execute/Stop buttons
 * - Node execution status
 * - Execution logs
 * - Selected node details
 */
export function ExecutionPanel() {
  const { status, nodeExecutions, logs, progress } = useExecutionStore()
  const { selectedNode, nodes, workflowName, updateNodeData, setConfigModalNode } = useFlowStore()
  const [copied, setCopied] = useState(false)
  const [configExpanded, setConfigExpanded] = useState(false)

  const nodeData = selectedNode?.data as BaseNodeData | undefined

  const handleCopyUuid = useCallback(async () => {
    if (nodeData?.uuid) {
      await navigator.clipboard.writeText(nodeData.uuid)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [nodeData?.uuid])

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { name: e.target.value })
    }
  }, [selectedNode, updateNodeData])

  const handleEditConfig = useCallback(() => {
    if (selectedNode) {
      setConfigModalNode(selectedNode)
    }
  }, [selectedNode, setConfigModalNode])

  const handleExecute = useCallback(() => {
    // TODO: Implement workflow execution
    console.log('Execute workflow - not implemented')
  }, [])

  const handleStop = useCallback(() => {
    // TODO: Implement stop execution
    console.log('Stop execution - not implemented')
  }, [])

  const handleSave = useCallback(() => {
    // TODO: Implement save workflow
    console.log('Save workflow - not implemented')
  }, [])

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Workflow Info */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Workflow
        </h2>
        <div className="text-sm text-slate-600">
          <div className="font-medium">{workflowName}</div>
          <div className="text-xs text-slate-400 mt-1">
            {nodes.length} nodes
          </div>
        </div>
      </div>

      {/* Execution Controls */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Execution
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleExecute}
            disabled={status === 'running'}
            className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium
                       hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed
                       transition-colors"
          >
            {status === 'running' ? 'Running...' : 'Execute'}
          </button>
          {status === 'running' && (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium
                         hover:bg-red-600 transition-colors"
            >
              Stop
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium
                       hover:bg-slate-300 transition-colors"
          >
            Save
          </button>
        </div>

        {/* Progress bar */}
        {status === 'running' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'idle'
                ? 'bg-slate-400'
                : status === 'running'
                ? 'bg-blue-500 animate-pulse'
                : status === 'completed'
                ? 'bg-green-500'
                : status === 'failed'
                ? 'bg-red-500'
                : 'bg-yellow-500'
            }`}
          />
          <span className="text-sm text-slate-600 capitalize">{status}</span>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && nodeData && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Selected Node
          </h2>
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
            {/* Name (editable) */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input
                type="text"
                value={nodeData.name || nodeData.label || ''}
                onChange={handleNameChange}
                className="w-full text-sm font-medium border border-slate-200 rounded px-2 py-1 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-none"
              />
            </div>

            {/* UUID (read-only with copy) */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">UUID</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded select-all truncate">
                  {nodeData.uuid || 'N/A'}
                </div>
                <button
                  onClick={handleCopyUuid}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Type</label>
              <div className="text-sm text-slate-700">{nodeData.nodeType}</div>
            </div>

            {/* Configuration (collapsible) */}
            {nodeData.config && Object.keys(nodeData.config).length > 0 && (
              <div>
                <button
                  onClick={() => setConfigExpanded(!configExpanded)}
                  className="flex items-center justify-between w-full text-xs text-slate-500 hover:text-slate-700"
                >
                  <span>Configuration</span>
                  <span>{configExpanded ? '▼' : '▶'}</span>
                </button>
                {configExpanded && (
                  <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto max-h-32 mt-1 whitespace-pre-wrap">
                    {JSON.stringify(nodeData.config, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Edit Configuration Button */}
            <button
              onClick={handleEditConfig}
              className="w-full mt-2 px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
            >
              Edit Configuration
            </button>
          </div>
        </div>
      )}

      {/* Node Execution Status */}
      {nodeExecutions.size > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Node Status
          </h2>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {Array.from(nodeExecutions.values()).map((exec) => (
              <div
                key={exec.nodeId}
                className="flex items-center justify-between text-sm py-1"
              >
                <span className="text-slate-600 truncate max-w-[150px]">
                  {exec.nodeId}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    exec.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : exec.status === 'running'
                      ? 'bg-blue-100 text-blue-700'
                      : exec.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : exec.status === 'scheduled'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {exec.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Logs
        </h2>
        <div className="flex-1 bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs overflow-auto">
          {logs.length === 0 ? (
            <div className="text-slate-500">No logs yet</div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`py-0.5 ${
                  log.level === 'error'
                    ? 'text-red-400'
                    : log.level === 'warn'
                    ? 'text-yellow-400'
                    : log.level === 'debug'
                    ? 'text-slate-500'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-slate-500">
                  [{log.timestamp.toLocaleTimeString()}]
                </span>{' '}
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ExecutionPanel
