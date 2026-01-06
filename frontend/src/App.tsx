import { ReactFlowProvider } from '@xyflow/react'
import { FlowEditor } from './components/FlowEditor'
import { NodePalette } from './components/NodePalette'
import { ExecutionPanel } from './components/ExecutionPanel'

function App() {
  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col">
        {/* Header */}
        <header className="h-12 border-b border-slate-200 bg-white flex items-center px-4">
          <h1 className="text-lg font-semibold text-slate-900">SwarmX-UI</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-500">Workflow Editor</span>
          </div>
        </header>

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
