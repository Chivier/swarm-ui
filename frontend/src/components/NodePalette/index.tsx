import { DragEvent, useCallback, useState } from 'react'

/**
 * Node category definition
 */
interface NodeCategory {
  name: string
  icon: string
  nodes: Array<{
    type: string
    label: string
    description: string
  }>
}

/**
 * Available node categories and types
 * Based on DESIGN.md P0 (MVP) nodes
 */
const NODE_CATEGORIES: NodeCategory[] = [
  {
    name: 'Core',
    icon: '⚙️',
    nodes: [
      { type: 'core.input', label: 'Input', description: 'Workflow input' },
      { type: 'core.output', label: 'Output', description: 'Workflow output' },
    ],
  },
  {
    name: 'AI',
    icon: '🤖',
    nodes: [
      { type: 'ai.openai.chat', label: 'OpenAI', description: 'GPT models (gpt-4, gpt-3.5-turbo)' },
      { type: 'ai.openai.compatible', label: 'OpenAI Compatible', description: 'Custom API endpoint' },
    ],
  },
  {
    name: 'Code',
    icon: '💻',
    nodes: [
      { type: 'code.python', label: 'Python', description: 'Python script' },
    ],
  },
  {
    name: 'Flow',
    icon: '🔀',
    nodes: [
      { type: 'flow.if', label: 'IF', description: 'Conditional branch' },
      { type: 'flow.loop', label: 'Loop', description: 'Iterate array' },
      { type: 'flow.merge', label: 'Merge', description: 'Merge branches' },
    ],
  },
  {
    name: 'HTTP',
    icon: '🌐',
    nodes: [
      { type: 'http.request', label: 'HTTP Request', description: 'HTTP request' },
    ],
  },
  {
    name: 'Trigger',
    icon: '⚡',
    nodes: [
      { type: 'trigger.manual', label: 'Manual', description: 'Manual trigger' },
      { type: 'trigger.webhook', label: 'Webhook', description: 'HTTP trigger' },
    ],
  },
  {
    name: 'File',
    icon: '📁',
    nodes: [
      { type: 'file.read', label: 'Read File', description: 'Read file' },
      { type: 'file.write', label: 'Write File', description: 'Write file' },
    ],
  },
]

/**
 * NodePalette - Sidebar with draggable node types
 *
 * Features:
 * - Categorized node list
 * - Drag and drop to canvas
 * - Search/filter (TODO)
 */
export function NodePalette() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(NODE_CATEGORIES.map((c) => c.name))
  )

  const toggleCategory = useCallback((name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  const onDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, nodeType: string) => {
      event.dataTransfer.setData('application/reactflow', nodeType)
      event.dataTransfer.effectAllowed = 'move'
    },
    []
  )

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
        Nodes
      </h2>

      <div className="space-y-3">
        {NODE_CATEGORIES.map((category) => (
          <div key={category.name}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <span className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </span>
              <span className="text-slate-400">
                {expandedCategories.has(category.name) ? '−' : '+'}
              </span>
            </button>

            {/* Category nodes */}
            {expandedCategories.has(category.name) && (
              <div className="space-y-2 mt-1">
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    className="node-palette-item"
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                  >
                    <div className="font-medium text-sm text-slate-800">
                      {node.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {node.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default NodePalette
