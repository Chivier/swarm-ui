#!/bin/bash

# SwarmX-UI Build Script
# Interactive CLI for building and running the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "  ____                              __  __      _   _ ___ "
    echo " / ___|_      ____ _ _ __ _ __ ___ \\ \\/ /     | | | |_ _|"
    echo " \\___ \\ \\ /\\ / / _\` | '__| '_ \` _ \\ \\  /_____| | | || | "
    echo "  ___) \\ V  V / (_| | |  | | | | | |/  \\_____| |_| || | "
    echo " |____/ \\_/\\_/ \\__,_|_|  |_| |_| |_/_/\\_\\     \\___/|___|"
    echo -e "${NC}"
    echo -e "${PURPLE}  Low-code Workflow Orchestration Platform${NC}"
    echo ""
}

# Print menu
print_menu() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}  SwarmX-UI Build & Run Menu${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "  ${YELLOW}Build Commands:${NC}"
    echo "    1) Build Backend (Rust)"
    echo "    2) Build Frontend (React)"
    echo "    3) Build All"
    echo ""
    echo -e "  ${YELLOW}Run Commands:${NC}"
    echo "    4) Run Backend Server"
    echo "    5) Run Frontend Dev Server"
    echo "    6) Run All (Backend + Frontend)"
    echo ""
    echo -e "  ${YELLOW}Other Commands:${NC}"
    echo "    7) Check Backend"
    echo "    8) Lint Frontend"
    echo "    9) Clean Build Artifacts"
    echo "    0) Exit"
    echo ""
    echo -e "${BLUE}========================================${NC}"
}

# Check if required tools are installed
check_requirements() {
    local missing=()

    if ! command -v cargo &> /dev/null; then
        missing+=("cargo (Rust)")
    fi

    if ! command -v node &> /dev/null; then
        missing+=("node (Node.js)")
    fi

    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing required tools:${NC}"
        for tool in "${missing[@]}"; do
            echo -e "  - $tool"
        done
        echo ""
        echo "Please install the missing tools and try again."
        exit 1
    fi
}

# Build backend
build_backend() {
    echo -e "${CYAN}Building Backend (Rust)...${NC}"
    echo ""
    cd "$PROJECT_ROOT"
    cargo build --workspace --release
    echo ""
    echo -e "${GREEN}Backend build complete!${NC}"
}

# Build frontend
build_frontend() {
    echo -e "${CYAN}Building Frontend (React)...${NC}"
    echo ""
    cd "$FRONTEND_DIR"

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi

    npm run build
    echo ""
    echo -e "${GREEN}Frontend build complete!${NC}"
}

# Build all
build_all() {
    echo -e "${CYAN}Building All...${NC}"
    echo ""
    build_backend
    echo ""
    build_frontend
    echo ""
    echo -e "${GREEN}All builds complete!${NC}"
}

# Run backend
run_backend() {
    echo -e "${CYAN}Starting Backend Server...${NC}"
    echo -e "${YELLOW}Server will be available at: http://localhost:3000${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    cd "$PROJECT_ROOT"
    cargo run --package swarmx-api
}

# Run frontend
run_frontend() {
    echo -e "${CYAN}Starting Frontend Dev Server...${NC}"
    echo -e "${YELLOW}Server will be available at: http://localhost:5173${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    cd "$FRONTEND_DIR"

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi

    npm run dev
}

# Run all (backend + frontend in parallel)
run_all() {
    echo -e "${CYAN}Starting Backend and Frontend...${NC}"
    echo -e "${YELLOW}Backend: http://localhost:3000${NC}"
    echo -e "${YELLOW}Frontend: http://localhost:5173${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
    echo ""

    # Install frontend dependencies if needed
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        cd "$FRONTEND_DIR"
        npm install
        cd "$PROJECT_ROOT"
    fi

    # Run both servers in parallel
    trap 'kill 0' SIGINT SIGTERM

    (cd "$PROJECT_ROOT" && cargo run --package swarmx-api) &
    (cd "$FRONTEND_DIR" && npm run dev) &

    wait
}

# Check backend (cargo check)
check_backend() {
    echo -e "${CYAN}Checking Backend...${NC}"
    echo ""
    cd "$PROJECT_ROOT"
    cargo check --workspace
    echo ""
    echo -e "${GREEN}Backend check complete!${NC}"
}

# Lint frontend
lint_frontend() {
    echo -e "${CYAN}Linting Frontend...${NC}"
    echo ""
    cd "$FRONTEND_DIR"

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi

    npm run lint
    echo ""
    echo -e "${GREEN}Frontend lint complete!${NC}"
}

# Clean build artifacts
clean_all() {
    echo -e "${CYAN}Cleaning build artifacts...${NC}"
    echo ""

    # Clean Rust target
    if [ -d "$PROJECT_ROOT/target" ]; then
        echo "Removing target/"
        rm -rf "$PROJECT_ROOT/target"
    fi

    # Clean frontend dist
    if [ -d "$FRONTEND_DIR/dist" ]; then
        echo "Removing frontend/dist/"
        rm -rf "$FRONTEND_DIR/dist"
    fi

    # Clean frontend node_modules (optional)
    read -p "Remove frontend/node_modules? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "$FRONTEND_DIR/node_modules" ]; then
            echo "Removing frontend/node_modules/"
            rm -rf "$FRONTEND_DIR/node_modules"
        fi
    fi

    echo ""
    echo -e "${GREEN}Clean complete!${NC}"
}

# Handle command line arguments
handle_args() {
    case "$1" in
        build-backend|bb)
            build_backend
            ;;
        build-frontend|bf)
            build_frontend
            ;;
        build-all|ba)
            build_all
            ;;
        run-backend|rb)
            run_backend
            ;;
        run-frontend|rf)
            run_frontend
            ;;
        run-all|ra)
            run_all
            ;;
        check|c)
            check_backend
            ;;
        lint|l)
            lint_frontend
            ;;
        clean)
            clean_all
            ;;
        help|h|--help|-h)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  build-backend, bb   Build the Rust backend"
            echo "  build-frontend, bf  Build the React frontend"
            echo "  build-all, ba       Build both backend and frontend"
            echo "  run-backend, rb     Run the backend server"
            echo "  run-frontend, rf    Run the frontend dev server"
            echo "  run-all, ra         Run both servers"
            echo "  check, c            Check backend (cargo check)"
            echo "  lint, l             Lint frontend"
            echo "  clean               Clean build artifacts"
            echo "  help, h             Show this help message"
            echo ""
            echo "If no command is provided, an interactive menu will be shown."
            ;;
        "")
            return 1
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo "Run '$0 help' for usage information."
            exit 1
            ;;
    esac
    return 0
}

# Main interactive loop
interactive_menu() {
    while true; do
        print_menu
        read -p "Enter your choice [0-9]: " choice
        echo ""

        case $choice in
            1)
                build_backend
                ;;
            2)
                build_frontend
                ;;
            3)
                build_all
                ;;
            4)
                run_backend
                ;;
            5)
                run_frontend
                ;;
            6)
                run_all
                ;;
            7)
                check_backend
                ;;
            8)
                lint_frontend
                ;;
            9)
                clean_all
                ;;
            0)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice. Please try again.${NC}"
                ;;
        esac

        echo ""
        read -p "Press Enter to continue..."
        clear
        print_banner
    done
}

# Main entry point
main() {
    # Check requirements first
    check_requirements

    # Handle command line arguments
    if [ $# -gt 0 ]; then
        handle_args "$@"
        exit 0
    fi

    # Show interactive menu
    clear
    print_banner
    interactive_menu
}

main "$@"
