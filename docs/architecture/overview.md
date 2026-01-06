# Architecture Overview

## System Architecture

SwarmX-UI follows a client-server architecture where the client (SwarmX-UI) acts as the orchestrator and scheduler, while SwarmX servers act as stateless executors.

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
└───────────────────────────────────────────────────────────────────────┘
```

## Crate Structure

- **core**: DAG execution engine, scheduler, state machine
- **dataref**: DataRef pointer system, storage tiers, access control
- **events**: Event types, Write-Ahead Log, Kafka integration
- **protocol**: HTTP message types, workflow DSL
- **api**: Axum HTTP server, request handlers, callback receiver

## Frontend Structure

- **components**: React components (FlowEditor, NodePalette, ExecutionPanel)
- **stores**: Zustand state management (flowStore, executionStore)
- **hooks**: Custom React hooks (useApi, useWorkflow)
