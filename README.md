# SwarmX-UI

A low-code workflow orchestration platform with visual DAG editor for building computational pipelines.

## Overview

SwarmX-UI provides a drag-and-drop interface for composing LLM pipelines, Python scripts, and distributed computing tasks. It serves as the visual frontend and client-side runtime for the SwarmX distributed computing system.

### Key Features

- **Visual Workflow Editor**: n8n-style drag-and-drop interface for building computational DAGs
- **Client-Side Orchestrator**: Manages workflow execution state, scheduling decisions, and fault tolerance
- **Data Plane Coordination**: PGAS-style data reference system (DataRef) for efficient large-scale data handling
- **Multi-Provider AI Support**: OpenAI, Anthropic Claude, DeepSeek, Ollama, and more

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SwarmX-UI Client                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  Frontend   │  │    DAG      │  │   Event     │  │   Token    │  │
│  │  (React +   │◄─┤  Execution  │◄─┤   System    │  │   Manager  │  │
│  │ React Flow) │  │   Engine    │  │   (WAL)     │  │            │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │
│                                   │                                  │
│                              HTTP API                                │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
                           SwarmX Servers
```

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd swarm-ui

# Run the interactive build menu
chmod +x build.sh
./build.sh

# Or build and run directly
./build.sh build-all
./build.sh run-all
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

See [SETUP.md](SETUP.md) for detailed installation instructions.

## Tech Stack

### Backend (Rust)

| Component | Technology |
|-----------|------------|
| Async Runtime | Tokio |
| Web Framework | Axum |
| DAG Processing | petgraph |
| Persistence | SQLite (WAL) |
| Serialization | serde + JSON |

### Frontend (TypeScript/React)

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Flow Editor | React Flow (@xyflow/react) |
| State Management | Zustand |
| Styling | Tailwind CSS |
| Build | Vite |

## Project Structure

```
swarm-ui/
├── crates/
│   ├── core/           # DAG engine, scheduler, state machine
│   ├── dataref/        # DataRef, storage tier, access control
│   ├── events/         # Event types, WAL, Kafka integration
│   ├── protocol/       # HTTP message types
│   └── api/            # Axum server, HTTP handlers
├── frontend/
│   ├── src/
│   │   ├── components/ # FlowEditor, NodePalette, ExecutionPanel
│   │   ├── stores/     # Zustand stores
│   │   └── hooks/      # Custom React hooks
│   └── package.json
└── examples/           # Example workflow definitions
```

## Node Types

SwarmX-UI supports extensible node types organized by priority:

### P0: MVP (14 nodes)
- **Flow**: IF, Merge, Loop
- **Trigger**: Manual, Webhook
- **Core**: Input, Output
- **Code**: Python
- **HTTP**: HTTP Request
- **AI**: OpenAI, Anthropic, DeepSeek
- **File**: Read, Write

### P1: Extensions (14 nodes)
- **Flow**: Switch, Parallel, Error Handler
- **Code**: Shell, JavaScript
- **AI**: Ollama, vLLM, Gemini
- **Format**: JSON, CSV, PDF parsing

See [DESIGN.md](DESIGN.md) for the complete node type roadmap.

## Example Workflow

```json
{
  "name": "PDF Summarizer",
  "nodes": [
    { "id": "input", "type": "core.input" },
    { "id": "extract", "type": "format.pdf.extract" },
    { "id": "summarize", "type": "ai.openai.chat" },
    { "id": "output", "type": "core.output" }
  ],
  "edges": [
    { "source": "input", "target": "extract" },
    { "source": "extract", "target": "summarize" },
    { "source": "summarize", "target": "output" }
  ]
}
```

## Development

### Build Commands

```bash
# Backend
cargo check --workspace    # Type check
cargo build --workspace    # Debug build
cargo build --release      # Release build
cargo test --workspace     # Run tests

# Frontend
cd frontend
npm run dev                # Dev server
npm run build              # Production build
npm run lint               # ESLint
```

### Using the Build Script

```bash
./build.sh              # Interactive menu
./build.sh bb           # Build backend
./build.sh bf           # Build frontend
./build.sh rb           # Run backend
./build.sh rf           # Run frontend
./build.sh ra           # Run all
```

## Documentation

- [SETUP.md](SETUP.md) - Installation and setup guide
- [DESIGN.md](DESIGN.md) - Architecture and design details

## License

[License details here]

## Authors

- Chivier
- Claude

---

*Built with Rust and React*
