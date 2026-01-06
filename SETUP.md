# SwarmX-UI Setup Guide

This guide will help you set up the SwarmX-UI development environment.

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Rust | 1.75+ | Backend development |
| Node.js | 18+ | Frontend development |
| npm | 9+ | Package management |

### Installation

**macOS (Homebrew)**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js
brew install node
```

**Ubuntu/Debian**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows**
```powershell
# Install Rust (download from https://rustup.rs)
# Install Node.js (download from https://nodejs.org)
```

## Quick Start

### Using the Build Script (Recommended)

The interactive build script provides a convenient way to build and run the project:

```bash
# Make the script executable (first time only)
chmod +x build.sh

# Run the interactive menu
./build.sh

# Or use direct commands
./build.sh build-all    # Build backend and frontend
./build.sh run-all      # Run both servers
```

### Manual Setup

**1. Clone the Repository**
```bash
git clone <repository-url>
cd swarm-ui
```

**2. Build the Backend**
```bash
cargo build --workspace --release
```

**3. Set Up the Frontend**
```bash
cd frontend
npm install
npm run build
```

## Running the Application

### Development Mode

**Backend Server** (Port 3000)
```bash
cargo run --package swarmx-api

# Or using the build script
./build.sh run-backend
```

**Frontend Dev Server** (Port 5173)
```bash
cd frontend
npm run dev

# Or using the build script
./build.sh run-frontend
```

**Run Both Servers**
```bash
./build.sh run-all
```

### Production Build

```bash
# Build optimized backend
cargo build --workspace --release

# Build optimized frontend
cd frontend && npm run build
```

The frontend build output will be in `frontend/dist/`.

## Build Script Commands

| Command | Shorthand | Description |
|---------|-----------|-------------|
| `build-backend` | `bb` | Build Rust backend |
| `build-frontend` | `bf` | Build React frontend |
| `build-all` | `ba` | Build both components |
| `run-backend` | `rb` | Start backend server |
| `run-frontend` | `rf` | Start frontend dev server |
| `run-all` | `ra` | Start both servers |
| `check` | `c` | Run cargo check |
| `lint` | `l` | Lint frontend code |
| `clean` | - | Clean build artifacts |

## Project Structure

```
swarm-ui/
├── Cargo.toml              # Rust workspace config
├── build.sh                # Interactive build script
├── crates/
│   ├── core/               # DAG engine, scheduler
│   ├── dataref/            # DataRef, access control
│   ├── events/             # Event system, WAL
│   ├── protocol/           # HTTP message types
│   └── api/                # Axum web server
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── stores/         # Zustand state
│   │   └── hooks/          # Custom hooks
│   └── package.json
└── examples/               # Example workflows
```

## Configuration

### Backend Configuration

Environment variables:
```bash
# Server port (default: 3000)
export SWARMX_PORT=3000

# Log level
export RUST_LOG=info

# WAL database path
export SWARMX_WAL_PATH=./data/wal.db
```

### Frontend Configuration

The frontend uses Vite's proxy configuration for API calls. See `frontend/vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

## Troubleshooting

### Common Issues

**Rust build fails with missing dependencies**
```bash
# Install system dependencies (Ubuntu)
sudo apt-get install build-essential pkg-config libssl-dev

# Install system dependencies (macOS)
xcode-select --install
```

**Frontend npm install fails**
```bash
# Clear npm cache and retry
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Port already in use**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Getting Help

- Check the [README.md](README.md) for project overview
- Review the [DESIGN.md](DESIGN.md) for architecture details
- Open an issue on GitHub for bugs or feature requests

## Next Steps

After setup:
1. Run `./build.sh` and select option 6 to start both servers
2. Open http://localhost:5173 in your browser
3. Explore the visual workflow editor
4. Check the `examples/` directory for sample workflows
