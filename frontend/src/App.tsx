import { ReactFlowProvider } from '@xyflow/react'
import { FlowEditor } from './components/FlowEditor'
import { NodePalette } from './components/NodePalette'
import { ExecutionPanel } from './components/ExecutionPanel'
import { NodeConfigModal } from './components/NodeConfigModal'
import { useWorkflow, useAutoSave } from './hooks'
import { useFlowStore } from './stores'

/**
 * Node configuration modal wrapper
 */
function NodeConfigModalWrapper() {
  const { configModalNode, setConfigModalNode } = useFlowStore()

  return (
    <NodeConfigModal
      node={configModalNode}
      isOpen={!!configModalNode}
      onClose={() => setConfigModalNode(null)}
    />
  )
}

/**
 * Recovery dialog for auto-saved workflow
 */
function RecoveryDialog() {
  const { hasRecovery, recoverAutoSave, dismissRecovery, getRecoveryTimestamp } = useAutoSave()

  if (!hasRecovery) return null

  const timestamp = getRecoveryTimestamp()
  const timeString = timestamp
    ? timestamp.toLocaleString()
    : 'unknown time'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Recover Unsaved Work?
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          We found an auto-saved workflow from <strong>{timeString}</strong>.
          Would you like to recover it?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={dismissRecovery}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            Discard
          </button>
          <button
            onClick={recoverAutoSave}
            className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded transition-colors"
          >
            Recover
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Header toolbar with workflow controls
 */
function HeaderToolbar() {
  const {
    newWorkflow,
    saveToFile,
    loadFromFile,
    fileError,
  } = useWorkflow()

  const { lastAutoSave, triggerAutoSave } = useAutoSave()
  const { workflowName, setWorkflowName, isDirty, nodes } = useFlowStore()

  // Format last auto-save time
  const autoSaveText = lastAutoSave
    ? `Auto-saved ${lastAutoSave.toLocaleTimeString()}`
    : null

  return (
    <header className="h-12 border-b border-slate-200 bg-white flex items-center px-4 gap-4">
      {/* Logo */}
      <h1 className="text-lg font-semibold text-slate-900">SwarmX-UI</h1>

      {/* Separator */}
      <div className="h-6 w-px bg-slate-200" />

      {/* Workflow name */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-sky-500 rounded px-2 py-1"
          placeholder="Workflow name"
        />
        {isDirty && (
          <button
            onClick={triggerAutoSave}
            className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded hover:bg-amber-100 transition-colors"
            title="Click to save now"
          >
            unsaved
          </button>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Auto-save indicator */}
      {autoSaveText && (
        <span className="text-xs text-slate-400">{autoSaveText}</span>
      )}

      {/* Error message */}
      {fileError && (
        <span className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded">
          {fileError}
        </span>
      )}

      {/* Node count */}
      <span className="text-xs text-slate-500">
        {nodes.length} nodes
      </span>

      {/* Separator */}
      <div className="h-6 w-px bg-slate-200" />

      {/* Toolbar buttons */}
      <div className="flex items-center gap-2">
        {/* New */}
        <button
          onClick={newWorkflow}
          className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="New workflow"
        >
          New
        </button>

        {/* Open */}
        <button
          onClick={loadFromFile}
          className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Open workflow (JSON)"
        >
          Open
        </button>

        {/* Save */}
        <button
          onClick={saveToFile}
          className="px-3 py-1.5 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded transition-colors"
          title="Save workflow (JSON)"
        >
          Save
        </button>
      </div>
    </header>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col">
        {/* Modals */}
        <RecoveryDialog />
        <NodeConfigModalWrapper />

        {/* Header with toolbar */}
        <HeaderToolbar />

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Node Palette */}
          <aside className="w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto">
            <NodePalette />
          </aside>

          {/* Main content - Flow Editor */}
          <main className="flex-1 relative">
            <FlowEditor />
          </main>

          {/* Right sidebar - Execution Panel */}
          <aside className="w-80 border-l border-slate-200 bg-slate-50 overflow-y-auto">
            <ExecutionPanel />
          </aside>
        </div>
      </div>
    </ReactFlowProvider>
  )
}

export default App
