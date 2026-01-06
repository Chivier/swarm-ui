# Getting Started

## Prerequisites

- Rust 1.75+ (for backend)
- Node.js 20+ (for frontend)
- npm or pnpm

## Building the Backend

```bash
# Build all crates
cargo build --workspace

# Run the API server
cargo run --package swarmx-api
```

## Building the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Development

The backend API server runs on `http://localhost:3000` and the frontend development server runs on `http://localhost:5173` with automatic API proxying.

## Project Structure

```
swarm-ui/
├── Cargo.toml           # Workspace root
├── crates/
│   ├── core/            # DAG engine, scheduler
│   ├── dataref/         # DataRef system
│   ├── events/          # Event system, WAL
│   ├── protocol/        # HTTP message types
│   └── api/             # HTTP server
├── frontend/            # React application
├── docs/                # Documentation
└── examples/            # Example workflows
```
