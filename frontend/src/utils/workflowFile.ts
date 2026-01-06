import { Node, Edge, MarkerType } from '@xyflow/react'
import { getNodeTypeKey } from '../components/nodes'

/**
 * Workflow JSON file format
 * Compatible with DESIGN.md specification
 */
export interface WorkflowFile {
  id: string
  name: string
  version: number
  variables?: Record<string, unknown>
  nodes: WorkflowNodeDef[]
  edges: WorkflowEdgeDef[]
  execution?: {
    mode: 'local' | 'remote' | 'hybrid'
    server?: string
    timeout_ms?: number
    retry_policy?: {
      max_retries: number
      backoff_ms: number
      backoff_multiplier: number
    }
  }
  metadata?: {
    author?: string
    tags?: string[]
    created_at?: number
    updated_at?: number
  }
}

export interface WorkflowNodeDef {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
  inputs?: Array<{ name: string; dtype: string; required?: boolean }>
  outputs?: Array<{ name: string; dtype: string }>
  position: { x: number; y: number }
}

export interface WorkflowEdgeDef {
  source: string
  source_output: string
  target: string
  target_input: string
  transform?: string
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Serialize React Flow nodes and edges to workflow JSON format
 */
export function serializeWorkflow(
  nodes: Node[],
  edges: Edge[],
  options: {
    id?: string
    name?: string
    version?: number
  } = {}
): WorkflowFile {
  const workflowNodes: WorkflowNodeDef[] = nodes.map((node) => ({
    id: node.id,
    type: String(node.data?.nodeType || node.type || 'default'),
    name: String(node.data?.label || node.id),
    config: (node.data?.config as Record<string, unknown>) || {},
    inputs: node.data?.inputs as WorkflowNodeDef['inputs'],
    outputs: node.data?.outputs as WorkflowNodeDef['outputs'],
    position: { x: node.position.x, y: node.position.y },
  }))

  const workflowEdges: WorkflowEdgeDef[] = edges.map((edge) => ({
    source: edge.source,
    source_output: edge.sourceHandle || 'right',
    target: edge.target,
    target_input: edge.targetHandle || 'left',
    transform: edge.data?.transform as string | undefined,
  }))

  return {
    id: options.id || generateId(),
    name: options.name || 'Untitled Workflow',
    version: options.version || 1,
    nodes: workflowNodes,
    edges: workflowEdges,
    execution: {
      mode: 'local',
      timeout_ms: 300000,
      retry_policy: {
        max_retries: 3,
        backoff_ms: 1000,
        backoff_multiplier: 2.0,
      },
    },
    metadata: {
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  }
}

/**
 * Deserialize workflow JSON to React Flow nodes and edges
 */
export function deserializeWorkflow(workflow: WorkflowFile): {
  nodes: Node[]
  edges: Edge[]
} {
  const nodes: Node[] = workflow.nodes.map((nodeDef) => ({
    id: nodeDef.id,
    type: getNodeTypeKey(nodeDef.type),
    position: nodeDef.position,
    data: {
      label: nodeDef.name,
      nodeType: nodeDef.type,
      description: getNodeDescription(nodeDef.type),
      config: nodeDef.config,
      inputs: nodeDef.inputs,
      outputs: nodeDef.outputs,
    },
  }))

  const edges: Edge[] = workflow.edges.map((edgeDef, index) => ({
    id: `e-${edgeDef.source}-${edgeDef.target}-${index}`,
    source: edgeDef.source,
    target: edgeDef.target,
    sourceHandle: edgeDef.source_output,
    targetHandle: edgeDef.target_input,
    type: 'smoothstep',
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#64748b',
    },
    data: edgeDef.transform ? { transform: edgeDef.transform } : undefined,
  }))

  return { nodes, edges }
}

/**
 * Get description for a node type
 */
function getNodeDescription(nodeType: string): string {
  const descriptions: Record<string, string> = {
    'ai.openai.chat': 'GPT models',
    'ai.anthropic.chat': 'Anthropic Claude',
    'ai.deepseek.chat': 'DeepSeek models',
    'code.python': 'Python script',
    'flow.if': 'Conditional branch',
    'flow.loop': 'Iterate array',
    'flow.merge': 'Merge branches',
    'http.request': 'HTTP request',
    'trigger.manual': 'Manual trigger',
    'trigger.webhook': 'HTTP trigger',
    'core.input': 'Workflow input',
    'core.output': 'Workflow output',
    'file.read': 'Read file',
    'file.write': 'Write file',
  }
  return descriptions[nodeType] || ''
}

/**
 * Format date for filename
 */
function formatDateForFilename(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

/**
 * Download workflow as JSON file with timestamp in filename
 */
export function downloadWorkflowFile(workflow: WorkflowFile): void {
  const json = JSON.stringify(workflow, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const timestamp = formatDateForFilename(new Date())
  const safeName = workflow.name.replace(/\s+/g, '-').toLowerCase()

  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}-${timestamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Read workflow from file input
 */
export function readWorkflowFile(file: File): Promise<WorkflowFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const workflow = JSON.parse(json) as WorkflowFile

        // Validate required fields
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
          throw new Error('Invalid workflow: missing nodes array')
        }
        if (!workflow.edges || !Array.isArray(workflow.edges)) {
          throw new Error('Invalid workflow: missing edges array')
        }

        resolve(workflow)
      } catch (error) {
        reject(new Error(`Failed to parse workflow file: ${error}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

/**
 * LocalStorage key for auto-save
 */
const AUTOSAVE_KEY = 'swarmx-ui-autosave'
const AUTOSAVE_TIMESTAMP_KEY = 'swarmx-ui-autosave-timestamp'

/**
 * Save workflow to localStorage (auto-save)
 */
export function saveToLocalStorage(workflow: WorkflowFile): void {
  try {
    const json = JSON.stringify(workflow)
    localStorage.setItem(AUTOSAVE_KEY, json)
    localStorage.setItem(AUTOSAVE_TIMESTAMP_KEY, new Date().toISOString())
  } catch (error) {
    console.error('Failed to auto-save to localStorage:', error)
  }
}

/**
 * Load workflow from localStorage (auto-save recovery)
 */
export function loadFromLocalStorage(): WorkflowFile | null {
  try {
    const json = localStorage.getItem(AUTOSAVE_KEY)
    if (!json) return null
    return JSON.parse(json) as WorkflowFile
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * Get auto-save timestamp
 */
export function getAutoSaveTimestamp(): Date | null {
  try {
    const timestamp = localStorage.getItem(AUTOSAVE_TIMESTAMP_KEY)
    if (!timestamp) return null
    return new Date(timestamp)
  } catch {
    return null
  }
}

/**
 * Clear auto-save from localStorage
 */
export function clearAutoSave(): void {
  localStorage.removeItem(AUTOSAVE_KEY)
  localStorage.removeItem(AUTOSAVE_TIMESTAMP_KEY)
}

/**
 * Check if auto-save exists
 */
export function hasAutoSave(): boolean {
  return localStorage.getItem(AUTOSAVE_KEY) !== null
}

/**
 * Validate workflow structure
 */
export function validateWorkflow(workflow: WorkflowFile): string[] {
  const errors: string[] = []

  if (!workflow.id) {
    errors.push('Missing workflow ID')
  }

  if (!workflow.name) {
    errors.push('Missing workflow name')
  }

  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('Workflow has no nodes')
  }

  // Check for duplicate node IDs
  const nodeIds = new Set<string>()
  for (const node of workflow.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`)
    }
    nodeIds.add(node.id)
  }

  // Validate edges reference existing nodes
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references non-existent source node: ${edge.source}`)
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references non-existent target node: ${edge.target}`)
    }
  }

  return errors
}
