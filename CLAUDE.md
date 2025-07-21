# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Running
```bash
npm run build              # Compile TypeScript to dist/
npm run dev:sse           # Start development server with auto-reload (port 6900)
npm run start:sse         # Start production SSE server
npm run docker:compose    # Run with Docker
```

## Architecture Overview

This is an MCP (Model Context Protocol) server that bridges SMS API services to AI assistants. It provides two transport mechanisms:

1. **SSE Server (src/sse-server.ts)** - Primary production server
   - HTTP endpoint at `/mcp` for JSON-RPC calls
   - SSE endpoint at `/sse` for streaming connections
   - Per-connection API key authentication
   - Express-based with CORS support

2. **Stdio Server (src/index.ts)** - Original MCP implementation
   - Uses standard input/output for local connections
   - Single API key from environment

### Core Tools Implementation

All tools follow the same pattern:
1. Receive parameters from MCP request
2. Build URL with query parameters for SMS API
3. Make GET request to `SMS_API_BASE_URL`
4. Return formatted JSON response

The four tools (`generate_number`, `get_sms`, `get_balance`, `get_active_numbers`) are implemented identically in both servers, just with different transport layers.

### API Authentication Flow

- SSE: API key passed as query parameter: `/sse?apiKey=YOUR_KEY`
- HTTP: API key in header: `X-API-Key: YOUR_KEY` or `Authorization: Bearer YOUR_KEY`
- Each connection creates its own MCP server instance with the provided API key
- API key is appended to all SMS API requests

## Environment Configuration

Required environment variables:
- `SMS_API_BASE_URL` - SMS service endpoint (default: https://mobilesms.io/webapp/api.php)
- `PORT` - Server port (default: 6900)

## Docker Deployment

The project includes Docker configuration:
- Server runs on port 6900 inside container
- Health checks configured for auto-restart
- Use `./deploy.sh` for quick deployment
- Use `./deploy.sh --prune` to clean Docker resources before deployment

## Key Implementation Notes

1. **Error Handling**: Uses MCP-specific error codes (ErrorCode.MethodNotFound, ErrorCode.InternalError)
2. **TypeScript Config**: ES2020 target, ESNext modules, strict mode enabled
3. **No Global State**: Each connection is isolated with its own API key
4. **Timeout**: 30-second timeout on all SMS API requests
5. **Response Format**: All tools return MCP content array with text type