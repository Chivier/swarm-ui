# API Reference

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Workflows

| Method | Path | Description |
|--------|------|-------------|
| GET | /workflows | List all workflows |
| POST | /workflows | Create a workflow |
| GET | /workflows/{id} | Get workflow by ID |
| PUT | /workflows/{id} | Update workflow |
| DELETE | /workflows/{id} | Delete workflow |
| POST | /workflows/{id}/execute | Execute workflow |
| GET | /workflows/{id}/status | Get execution status |

### Executions

| Method | Path | Description |
|--------|------|-------------|
| GET | /executions | List all executions |
| GET | /executions/{id} | Get execution details |
| POST | /executions/{id}/cancel | Cancel execution |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | /tasks/{id} | Get task status |
| POST | /tasks/{id}/cancel | Cancel task |

### Data

| Method | Path | Description |
|--------|------|-------------|
| GET | /data/{uuid} | Get data by UUID |
| DELETE | /data/{uuid} | Delete data |

### Servers

| Method | Path | Description |
|--------|------|-------------|
| GET | /servers | List registered servers |
| POST | /servers | Register a server |
| DELETE | /servers/{address} | Unregister server |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Workflow not found",
    "details": null
  }
}
```
