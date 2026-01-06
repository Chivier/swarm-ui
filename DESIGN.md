# SwarmX-UI Architecture Overview

## Project Positioning

SwarmX-UI is a low-code workflow orchestration platform that serves as the visual frontend and client-side runtime for the SwarmX distributed computing system. It provides:

- **Visual Workflow Editor**: n8n-style drag-and-drop interface for building computational DAGs
- **Client-Side Orchestrator**: Manages workflow execution state, scheduling decisions, and fault tolerance
- **Data Plane Coordination**: Implements PGAS-style data reference system (DataRef) for efficient large-scale data handling

This project completes SwarmX's data plane capabilities while providing an accessible interface for users to compose LLM pipelines, Python scripts, and distributed computing tasks.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SwarmX-UI Client                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  Frontend   │  │    DAG      │  │   Event     │  │   Token    │  │
│  │  (React +   │◄─┤  Execution  │◄─┤   System    │  │   Manager  │  │
│  │ React Flow) │  │   Engine    │  │   (WAL)     │  │            │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                  │
│                              HTTP API                                │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         SwarmX Servers                                │
│                                                                       │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐           │
│  │  Server A   │◄────►│  Server B   │◄────►│  Server C   │           │
│  │             │      │             │      │             │           │
│  │ ┌─────────┐ │      │ ┌─────────┐ │      │ ┌─────────┐ │           │
│  │ │Executor │ │      │ │Executor │ │      │ │Executor │ │           │
│  │ │(Py/LLM) │ │      │ │(Py/LLM) │ │      │ │(Py/LLM) │ │           │
│  │ └─────────┘ │      │ └─────────┘ │      │ └─────────┘ │           │
│  │ ┌─────────┐ │      │ ┌─────────┐ │      │ ┌─────────┐ │           │
│  │ │  Local  │ │      │ │  Local  │ │      │ │  Local  │ │           │
│  │ │  Store  │ │      │ │  Store  │ │      │ │  Store  │ │           │
│  │ └─────────┘ │      │ └─────────┘ │      │ └─────────┘ │           │
│  └─────────────┘      └─────────────┘      └─────────────┘           │
│         ▲                                          ▲                  │
│         └──────────── Pull on Demand ──────────────┘                  │
│                      (UUID-based auth)                                │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Client-Server Separation

| Aspect | Client (SwarmX-UI) | Server (SwarmX) |
|--------|-------------------|-----------------|
| **Role** | Orchestrator, Scheduler | Executor, Storage |
| **State** | DAG topology, execution progress, DataRef registry | Task execution, local data store |
| **Persistence** | Event WAL, workflow definitions | Data objects, execution logs |
| **Scaling** | Single instance per workflow | Horizontally scalable |

The client maintains full control over workflow execution logic, while servers are stateless executors that can be added or removed dynamically.

### 2. DataRef (Global Pointer)

DataRef is the core abstraction for data management, inspired by PGAS (Partitioned Global Address Space) systems.

```rust
struct DataRef {
    uuid: UUID,                    // Globally unique identifier
    location: ServerAddr,          // Current primary location
    size_bytes: u64,               // Size hint for scheduling
    dtype: DataType,               // Type tag (Tensor, JSON, Bytes, etc.)
    storage_tier: StorageTier,     // VRAM | DRAM | Disk
    created_at: Timestamp,
    workflow_id: WorkflowID,       // For lifecycle management
}

enum DataType {
    Tensor { shape: Vec<usize>, dtype: TensorDType },
    JSON,
    Bytes,
    KVCache { model_id: String, seq_len: usize },
    File { mime_type: String },
}
```

**Key Properties**:
- **Immutable**: Once created, data is never modified (copy-on-write semantics)
- **Location-aware**: Scheduler uses location for affinity decisions
- **Tiered storage**: Automatic offload from VRAM → DRAM → Disk under pressure
- **Retained by default**: Intermediate results are kept for debugging and recovery

### 3. DAG Execution Model

Workflows are represented as Directed Acyclic Graphs where:
- **Nodes** represent computation units (LLM call, Python script, HTTP request, etc.)
- **Edges** represent data dependencies (DataRef flows)

```
Node State Machine:
                    
    ┌─────────┐     schedule      ┌───────────┐
    │ Pending │ ─────────────────►│ Scheduled │
    └─────────┘                   └─────┬─────┘
         ▲                              │
         │ retry                        │ server accepts
         │                              ▼
    ┌─────────┐     success       ┌───────────┐
    │ Failed  │◄──────────────────│  Running  │
    └─────────┘     failure       └─────┬─────┘
                                        │
                                        │ complete
                                        ▼
                                  ┌───────────┐
                                  │   Done    │
                                  └───────────┘
```

### 4. Event-Driven Architecture (HTTP + Callback)

All communication uses plain HTTP without TLS (internal network assumed trusted). Servers notify clients via HTTP callbacks:

```
Client                              Server
   │                                   │
   │─── POST /task ───────────────────►│
   │    { node_id, inputs: [DataRef],  │
   │      callback_url }               │
   │                                   │
   │◄── 202 Accepted ──────────────────│
   │    { task_id }                    │
   │                                   │
   │         ... server executing ...  │
   │                                   │
   │◄── POST callback_url ─────────────│
   │    { task_id, status: "progress", │
   │      progress: 0.5 }              │
   │                                   │
   │◄── POST callback_url ─────────────│
   │    { task_id, status: "complete", │
   │      outputs: [DataRef] }         │
```

**Recovery Mechanism**: If client restarts while tasks are pending, it polls `GET /task/{id}/status` for all in-flight tasks to recover state.

Events are persisted to a Write-Ahead Log (WAL) for crash recovery. Optional Kafka integration provides stronger durability guarantees.

### 5. LLM Session Affinity

LLM workloads require special handling due to KV cache locality:

```rust
struct LLMSession {
    session_id: UUID,
    model_id: String,
    kv_cache_ref: DataRef,          // Points to KV cache on server
    preferred_server: ServerAddr,    // Affinity hint
    seq_length: usize,
}
```

The scheduler maintains session affinity to avoid expensive KV cache migration. When a session's preferred server is unavailable, the client can either:
- Wait for the server to recover
- Trigger explicit migration (future: live migration support)
- Restart the session on a new server (losing KV cache)

### 6. Access Control

Data access is controlled via signed tokens:

```rust
struct AccessToken {
    data_uuid: UUID,
    issued_by: ClientID,
    issued_at: Timestamp,
    expires_at: Timestamp,
    permissions: Permissions,       // Read | Write | Delete
    signature: Signature,           // Client's private key signature
}
```

Servers trust each other and use UUID-based verification. When Server B needs data from Server A:
1. Server B includes the AccessToken in the pull request
2. Server A verifies the token signature and expiration
3. Data is transferred directly between servers (no client hop)

---

## Technology Stack

### Backend (Rust)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Async Runtime | Tokio | Industry standard, excellent ecosystem |
| Web Framework | Axum | Type-safe, Tower middleware ecosystem |
| DAG Processing | petgraph | Mature graph library with topological sort |
| Serialization | serde + JSON | n8n compatibility |
| Persistence | SQLite (WAL) | Embedded, zero-config, reliable |
| Message Queue | Kafka (optional) | Stronger durability for production |
| Python Interop | PyO3 | Low-latency for simple scripts |

### Frontend (TypeScript/React)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | React 18 | Ecosystem, React Flow compatibility |
| Flow Editor | React Flow | Most mature, n8n/dify proven |
| State Management | Zustand | Lightweight, good for complex UI state |
| Styling | Tailwind CSS | Rapid prototyping |
| HTTP Client | fetch / axios | Simple REST calls |
| Build | Vite | Fast dev experience |

---

## Data Flow Example

Consider a simple workflow: **PDF → Extract Text → Summarize with LLM**

```
┌──────────┐      ┌──────────────┐      ┌─────────────┐
│  Upload  │─────►│ Extract Text │─────►│ LLM Summary │
│   PDF    │      │   (Python)   │      │  (GPT-4)    │
└──────────┘      └──────────────┘      └─────────────┘
     │                   │                     │
     ▼                   ▼                     ▼
  DataRef_1          DataRef_2             DataRef_3
  (File, 5MB)        (JSON, 50KB)          (JSON, 2KB)
  Server A           Server A              Server B
```

**Execution Trace**:

1. User uploads PDF → Client creates `DataRef_1`, stores on Server A
2. Client schedules "Extract Text" → Server A (data locality)
3. Server A executes Python script, produces `DataRef_2` (inline return, small)
4. Client schedules "LLM Summary" → Server B (has GPT-4 model loaded)
5. Server B pulls `DataRef_2` from Server A (or client passes inline)
6. Server B executes LLM call, produces `DataRef_3`
7. Client marks workflow complete, all DataRefs retained for inspection

---

## Project Structure

```
swarmx-ui/
├── Cargo.toml                    # Workspace root
├── crates/
│   ├── core/                     # DAG engine, scheduler, state machine
│   │   ├── src/
│   │   │   ├── dag.rs
│   │   │   ├── scheduler.rs
│   │   │   ├── state.rs
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   │
│   ├── dataref/                  # DataRef, storage tier, access control
│   │   ├── src/
│   │   │   ├── pointer.rs
│   │   │   ├── token.rs
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   │
│   ├── events/                   # Event types, WAL, Kafka integration
│   │   ├── src/
│   │   │   ├── types.rs
│   │   │   ├── wal.rs
│   │   │   ├── kafka.rs
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   │
│   ├── protocol/                 # HTTP message types, serialization
│   │   ├── src/
│   │   │   ├── messages.rs
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   │
│   └── api/                      # Axum server, HTTP handlers, callback receiver
│       ├── src/
│       │   ├── handlers.rs
│       │   ├── callback.rs
│       │   └── main.rs
│       └── Cargo.toml
│
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlowEditor/
│   │   │   ├── NodePalette/
│   │   │   └── ExecutionPanel/
│   │   ├── stores/
│   │   ├── hooks/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                         # Documentation
│   ├── architecture/
│   ├── specs/
│   ├── guides/
│   └── api/
│
└── examples/                     # Example workflows
    ├── pdf-summarize.json
    ├── multi-llm-chain.json
    └── deepseek-coder.json
```

---

## Node Type System

Nodes are extensible units of computation. Node type definitions are maintained on the server side and discovered by the client at runtime.

### Node Type Definition (Server-side)

Each node type is defined by a manifest that describes its interface:

```json
{
  "type_id": "llm.deepseek.chat",
  "name": "DeepSeek Chat",
  "category": "LLM",
  "version": "1.0.0",
  "description": "DeepSeek chat completion API",
  
  "executor": {
    "kind": "python",
    "script": "nodes/llm/deepseek_chat.py",
    "entry_point": "execute",
    "requirements": ["openai", "httpx"]
  },
  
  "inputs": [
    { "name": "messages", "dtype": "json", "required": true },
    { "name": "system_prompt", "dtype": "string", "required": false },
    { "name": "context", "dtype": "string", "required": false }
  ],
  
  "outputs": [
    { "name": "response", "dtype": "string" },
    { "name": "usage", "dtype": "json" }
  ],
  
  "config_schema": {
    "model": { "type": "string", "default": "deepseek-chat", "enum": ["deepseek-chat", "deepseek-coder"] },
    "temperature": { "type": "number", "default": 0.7, "min": 0, "max": 2 },
    "max_tokens": { "type": "integer", "default": 4096 },
    "api_base": { "type": "string", "default": "https://api.deepseek.com/v1" },
    "api_key_env": { "type": "string", "default": "DEEPSEEK_API_KEY" }
  },
  
  "resources": {
    "gpu_required": false,
    "memory_mb": 512,
    "timeout_default_ms": 60000
  }
}
```

### Executor Kinds

| Kind | Description | Use Case |
|------|-------------|----------|
| `python` | Rust spawns Python subprocess | Most nodes, flexible |
| `binary` | Rust spawns native binary | Performance-critical |
| `http` | Rust makes HTTP request directly | External API wrappers |
| `builtin` | Implemented in Rust | Core operations |

### Execution Flow

```
Client                     Server (Rust)                    Executor
   │                            │                              │
   │── POST /task ─────────────►│                              │
   │   { node_type, inputs }    │                              │
   │                            │── spawn process ────────────►│
   │                            │   (python script.py)         │
   │                            │                              │
   │                            │◄── stdout: progress ─────────│
   │◄── callback: progress ─────│                              │
   │                            │                              │
   │                            │◄── stdout: result ───────────│
   │◄── callback: complete ─────│   { outputs: [...] }         │
```

Data is passed via:
- **Small data**: JSON in request/response body
- **Large data**: DataRef UUID, executor fetches via HTTP from local store

---

## Workflow JSON DSL

### Complete Example: DeepSeek Code Review Pipeline

```json
{
  "id": "workflow-uuid",
  "name": "Code Review with DeepSeek",
  "version": 1,
  
  "variables": {
    "deepseek_model": "deepseek-coder",
    "review_temperature": 0.3
  },
  
  "nodes": [
    {
      "id": "input-code",
      "type": "core.input",
      "name": "Source Code",
      "config": {
        "accept": ["text/plain", "text/x-python", "application/json"],
        "max_size_mb": 10
      },
      "outputs": [
        { "name": "content", "dtype": "string" },
        { "name": "filename", "dtype": "string" },
        { "name": "metadata", "dtype": "json" }
      ],
      "position": { "x": 100, "y": 200 }
    },
    
    {
      "id": "analyze-structure",
      "type": "script.python",
      "name": "Analyze Code Structure",
      "config": {
        "code": "import ast\n\ndef execute(inputs):\n    code = inputs['code']\n    tree = ast.parse(code)\n    functions = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]\n    classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]\n    return {\n        'structure': {'functions': functions, 'classes': classes},\n        'line_count': len(code.splitlines())\n    }",
        "requirements": []
      },
      "inputs": [
        { "name": "code", "dtype": "string", "required": true }
      ],
      "outputs": [
        { "name": "structure", "dtype": "json" },
        { "name": "line_count", "dtype": "integer" }
      ],
      "position": { "x": 350, "y": 100 }
    },
    
    {
      "id": "deepseek-review",
      "type": "llm.deepseek.chat",
      "name": "DeepSeek Code Review",
      "config": {
        "model": "{{variables.deepseek_model}}",
        "temperature": "{{variables.review_temperature}}",
        "max_tokens": 2048,
        "system_prompt": "You are an expert code reviewer. Analyze the code for bugs, security issues, and suggest improvements."
      },
      "inputs": [
        { "name": "messages", "dtype": "json", "required": true },
        { "name": "context", "dtype": "string", "required": false }
      ],
      "outputs": [
        { "name": "response", "dtype": "string" },
        { "name": "usage", "dtype": "json" }
      ],
      "position": { "x": 350, "y": 300 }
    },
    
    {
      "id": "format-report",
      "type": "script.python",
      "name": "Format Review Report",
      "config": {
        "code": "def execute(inputs):\n    review = inputs['review']\n    structure = inputs['structure']\n    return {\n        'report': f\"# Code Review Report\\n\\n## Structure\\n- Functions: {len(structure['functions'])}\\n- Classes: {len(structure['classes'])}\\n\\n## Review\\n{review}\"\n    }"
      },
      "inputs": [
        { "name": "review", "dtype": "string", "required": true },
        { "name": "structure", "dtype": "json", "required": true }
      ],
      "outputs": [
        { "name": "report", "dtype": "string" }
      ],
      "position": { "x": 600, "y": 200 }
    },
    
    {
      "id": "output-result",
      "type": "core.output",
      "name": "Review Report",
      "inputs": [
        { "name": "result", "dtype": "string", "required": true }
      ],
      "position": { "x": 850, "y": 200 }
    }
  ],
  
  "edges": [
    { 
      "source": "input-code", "source_output": "content",
      "target": "analyze-structure", "target_input": "code"
    },
    {
      "source": "input-code", "source_output": "content",
      "target": "deepseek-review", "target_input": "messages",
      "transform": "{{ [{'role': 'user', 'content': 'Review this code:\\n\\n' + value}] }}"
    },
    {
      "source": "analyze-structure", "source_output": "structure",
      "target": "deepseek-review", "target_input": "context",
      "transform": "{{ 'Code structure: ' + json.dumps(value) }}"
    },
    {
      "source": "deepseek-review", "source_output": "response",
      "target": "format-report", "target_input": "review"
    },
    {
      "source": "analyze-structure", "source_output": "structure",
      "target": "format-report", "target_input": "structure"
    },
    {
      "source": "format-report", "source_output": "report",
      "target": "output-result", "target_input": "result"
    }
  ],
  
  "execution": {
    "mode": "local",
    "server": "http://localhost:9090",
    "timeout_ms": 300000,
    "retry_policy": {
      "max_retries": 3,
      "backoff_ms": 1000,
      "backoff_multiplier": 2.0
    }
  },
  
  "metadata": {
    "author": "chivier",
    "tags": ["code-review", "deepseek", "llm"],
    "created_at": 1704153600000,
    "updated_at": 1704153600000
  }
}
```

### DSL Features

| Feature | Syntax | Example |
|---------|--------|---------|
| Variable reference | `{{variables.name}}` | `"{{variables.deepseek_model}}"` |
| Edge transform | `{{ expression }}` | `"{{ value.upper() }}"` |
| Conditional | `{{ if condition }}...{{ endif }}` | Template logic |
| JSON path | `{{ value.field.subfield }}` | Nested access |

### Execution Modes

```json
{
  "execution": {
    "mode": "local",           // "local" | "remote" | "hybrid"
    "server": "http://...",    // For remote/hybrid
    "local_executor": "/path/to/executor",  // For local
    ...
  }
}
```

| Mode | Description |
|------|-------------|
| `local` | Client runs executor directly (same machine) |
| `remote` | Client sends tasks to remote server |
| `hybrid` | Some nodes local, some remote (based on node affinity) |

---

## Node Types (按优先级)

### P0: 最小可用集 (MVP)

实现这些节点即可跑通完整工作流。

| Category | Type ID | Name | Description |
|----------|---------|------|-------------|
| **Flow** | `flow.if` | IF | 条件分支 |
| **Flow** | `flow.merge` | Merge | 合并分支 |
| **Flow** | `flow.loop` | Loop | 遍历数组 |
| **Trigger** | `trigger.manual` | Manual | 手动触发 |
| **Trigger** | `trigger.webhook` | Webhook | HTTP 触发 |
| **Core** | `core.input` | Input | 工作流输入 |
| **Core** | `core.output` | Output | 工作流输出 |
| **Code** | `code.python` | Python | Python 脚本 |
| **HTTP** | `http.request` | HTTP Request | 通用 HTTP 请求 |
| **AI** | `ai.openai.chat` | OpenAI | GPT 系列 |
| **AI** | `ai.anthropic.chat` | Claude | Anthropic Claude |
| **AI** | `ai.deepseek.chat` | DeepSeek | DeepSeek Chat/Coder |
| **File** | `file.read` | Read File | 读取文件 |
| **File** | `file.write` | Write File | 写入文件 |

**共 14 个节点**

---

### P1: 第一批扩展

完善控制流、增加本地 LLM 和常用格式处理。

| Category | Type ID | Name | Description |
|----------|---------|------|-------------|
| **Flow** | `flow.switch` | Switch | 多路分支 |
| **Flow** | `flow.parallel` | Parallel | 并行执行 |
| **Flow** | `flow.error` | Error Handler | 错误处理 |
| **Trigger** | `trigger.schedule` | Schedule | 定时触发 |
| **Code** | `code.shell` | Shell | Shell 命令 |
| **Code** | `code.javascript` | JavaScript | JS 脚本 (Deno) |
| **AI** | `ai.ollama` | Ollama | 本地 Ollama |
| **AI** | `ai.vllm` | vLLM | vLLM 推理服务 |
| **AI** | `ai.google.gemini` | Gemini | Google Gemini |
| **Format** | `format.json.parse` | Parse JSON | 解析 JSON |
| **Format** | `format.json.stringify` | Stringify | JSON 序列化 |
| **Format** | `format.csv.parse` | Parse CSV | 解析 CSV |
| **Format** | `format.pdf.extract` | Extract PDF | 提取 PDF 文本 |
| **SwarmX** | `swarmx.task` | SwarmX Task | SwarmX 任务提交 |

**共 14 个节点**

---

### P2: 进阶扩展

高级控制流、向量数据库、更多 AI 能力。

| Category | Type ID | Name | Description |
|----------|---------|------|-------------|
| **Flow** | `flow.batch` | Batch | 批量处理 |
| **Flow** | `flow.split` | Split | 拆分数组 |
| **Flow** | `flow.aggregate` | Aggregate | 聚合结果 |
| **Flow** | `flow.wait` | Wait | 延时等待 |
| **Flow** | `flow.stop` | Stop | 终止工作流 |
| **Flow** | `flow.retry` | Retry | 重试机制 |
| **Flow** | `flow.loop_while` | While Loop | 条件循环 |
| **Flow** | `flow.race` | Race | 竞争执行 |
| **Trigger** | `trigger.file_watch` | File Watcher | 文件监听 |
| **Trigger** | `trigger.event` | Event | 事件监听 |
| **AI** | `ai.openai.embedding` | Embedding | 文本向量化 |
| **AI** | `ai.openai.whisper` | Whisper | 语音转文字 |
| **AI** | `ai.openai.tts` | TTS | 文字转语音 |
| **AI** | `ai.openai.image` | DALL-E | 图像生成 |
| **AI** | `ai.vector.query` | Vector Query | 向量检索 |
| **AI** | `ai.vector.upsert` | Vector Upsert | 向量写入 |
| **AI** | `ai.agent.tool` | Agent Tool | Agent 工具调用 |
| **AI** | `ai.agent.memory` | Agent Memory | 对话记忆 |
| **AI** | `ai.huggingface` | HuggingFace | HF 推理 |
| **AI** | `ai.replicate` | Replicate | Replicate 模型 |
| **Code** | `code.sql` | SQL | SQL 查询 |
| **Code** | `code.expression` | Expression | 简单表达式 |
| **Format** | `format.xml.parse` | Parse XML | 解析 XML |
| **Format** | `format.yaml.parse` | Parse YAML | 解析 YAML |
| **Format** | `format.html.extract` | HTML Extract | HTML 提取 |
| **Format** | `format.markdown.render` | Markdown | 渲染 Markdown |
| **Format** | `format.pdf.generate` | Generate PDF | 生成 PDF |
| **File** | `file.list` | List Files | 列出文件 |
| **File** | `file.delete` | Delete | 删除文件 |
| **File** | `file.compress` | Compress | 压缩文件 |
| **File** | `file.decompress` | Decompress | 解压文件 |
| **HTTP** | `http.graphql` | GraphQL | GraphQL 请求 |
| **HTTP** | `http.sse` | SSE | Server-Sent Events |
| **Util** | `util.crypto.hash` | Hash | 生成哈希 |
| **Util** | `util.crypto.encrypt` | Encrypt | 加密 |
| **Util** | `util.crypto.decrypt` | Decrypt | 解密 |
| **Util** | `util.datetime` | DateTime | 时间处理 |
| **Util** | `util.uuid` | UUID | 生成 UUID |
| **Util** | `util.regex` | Regex | 正则处理 |
| **SwarmX** | `swarmx.gpu` | GPU Compute | GPU 计算 |
| **SwarmX** | `swarmx.agent` | Multi-Agent | 多 Agent 协调 |
| **SwarmX** | `swarmx.dataref` | DataRef Op | DataRef 管理 |

**共 42 个节点**

---

### P3: SaaS 集成 (暂不实现)

均可通过 `http.request` 节点 + Python 脚本实现，按需添加官方支持。

<details>
<summary>完整列表（点击展开）</summary>

**Database**
- `db.postgres` / `db.mysql` / `db.sqlite` / `db.mongodb`
- `db.redis` / `db.elasticsearch` / `db.supabase` / `db.firebase`
- `db.airtable` / `db.notion_db`

**Storage**
- `storage.s3` / `storage.gcs` / `storage.azure_blob`
- `storage.minio` / `storage.ftp`

**Communication**
- `comm.email.send` / `comm.email.read`
- `comm.slack` / `comm.discord` / `comm.telegram`
- `comm.teams` / `comm.whatsapp` / `comm.sms.twilio`

**Productivity**
- `prod.notion` / `prod.google_sheets` / `prod.google_docs`
- `prod.google_calendar` / `prod.google_drive`
- `prod.excel` / `prod.outlook`
- `prod.trello` / `prod.asana` / `prod.jira` / `prod.linear` / `prod.todoist`

**Development**
- `dev.github` / `dev.gitlab` / `dev.bitbucket` / `dev.git`
- `dev.docker` / `dev.npm` / `dev.pip`
- `dev.sentry` / `dev.datadog` / `dev.pagerduty`

**CRM & Marketing**
- `crm.hubspot` / `crm.salesforce` / `crm.pipedrive` / `crm.zoho`
- `marketing.mailchimp` / `marketing.sendgrid` / `marketing.intercom` / `marketing.segment`

**Finance**
- `finance.stripe` / `finance.paypal` / `finance.plaid`
- `finance.quickbooks` / `finance.xero`

**Social Media**
- `social.twitter` / `social.linkedin` / `social.facebook`
- `social.instagram` / `social.youtube` / `social.reddit`

</details>

---

### 节点总览

| 优先级 | 数量 | 状态 |
|--------|------|------|
| P0 (MVP) | 14 | 首版必须实现 |
| P1 | 14 | 第一批扩展 |
| P2 | 42 | 按需实现 |
| P3 (SaaS) | 60+ | 暂不实现，用 HTTP 代替 |

---

## Integration with SwarmX

SwarmX-UI is designed as the control plane for SwarmX's compute infrastructure:

| SwarmX Component | SwarmX-UI Integration |
|------------------|----------------------|
| GPU Scheduler | SwarmX-UI sends task hints (affinity, memory requirements) |
| Model Registry | SwarmX-UI queries available models for node configuration |
| Data Plane | DataRef system directly maps to SwarmX's storage abstraction |
| Monitoring | SwarmX-UI subscribes to resource metrics for scheduling decisions |

Future versions will support:
- Live migration of LLM sessions between servers
- Predictive scheduling based on SwarmX resource forecasting
- Direct integration with SwarmX's multi-agent coordination

---

## Development Phases

| Phase | Focus |
|-------|-------|
| 0 | Project setup, CI/CD |
| 1 | Data model (DataRef, Workflow DSL, Events) |
| 2 | DAG execution engine |
| 3 | Event system + fault tolerance |
| 4 | Frontend visual editor |
| 5 | Python execution environment |
| 6 | SwarmX integration |

---

## Next Steps

1. **Detailed Design Documents**:
   - `data-model.md`: DataRef schema, Workflow DSL specification
   - `protocols.md`: HTTP API specification, event formats
   - `client-design.md`: DAG engine internals, scheduler algorithms

2. **Prototype**:
   - Minimal DAG engine with mock server
   - Basic React Flow integration

3. **Iterate**:
   - Validate design with real SwarmX integration
   - Refine based on performance testing

---

*Document Version: 0.1.0*  
*Last Updated: 2026-01-02*  
*Authors: Chivier, Claude*
