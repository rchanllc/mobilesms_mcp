# MobileSMS.io MCP Server

A Model Context Protocol (MCP) server for SMS API integration with both SSE (Server-Sent Events) and HTTP endpoints.

## Features

- 🚀 **Dual Transport**: Supports both SSE and HTTP endpoints
- 🔐 **API Key Authentication**: Secure access with API key validation
- 🐳 **Docker Ready**: Production-ready Docker setup
- 🔄 **Auto-reload**: Development mode with automatic restarts
- 📊 **Health Monitoring**: Built-in health checks and monitoring
- 🌐 **CORS Support**: Cross-origin resource sharing enabled

## Available Tools

Short-term numbers:

1. **get_balance** - Get current account balance
2. **get_active_numbers** - List all active short-term phone numbers
3. **generate_number** - Generate a new SMS number for a service/country
4. **get_sms** - Retrieve SMS messages for a specific number

Long-term numbers (LTN, US only):

5. **ltn_get_numbers** - List your long-term numbers (number_id, expiry, status)
6. **ltn_rent_cost** - Quote the price to rent a US long-term number
7. **ltn_rent** - Rent a US long-term number from account credit (instant-only)
8. **ltn_extend** - Extend/renew an existing long-term number
9. **ltn_get_sms** - Get received SMS history for a long-term number

## Hosted Server

You don't need to run anything yourself. A public instance of this server is hosted at **https://mcp.mobilesms.io** — just bring your [mobilesms.io](https://mobilesms.io) API key.

| Endpoint | URL |
|---|---|
| SSE | `https://mcp.mobilesms.io/sse?apiKey=YOUR_API_KEY` |
| HTTP (JSON-RPC) | `https://mcp.mobilesms.io/mcp` (with `X-API-Key` header) |
| Health | `https://mcp.mobilesms.io/health` |
| API docs | `https://mcp.mobilesms.io/docs` |

**Claude CLI:**
```bash
claude mcp add -t sse mobilesms https://mcp.mobilesms.io/sse --sse-params '{"apiKey":"YOUR_API_KEY"}'
```

**Quick check:**
```bash
curl https://mcp.mobilesms.io/health

curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_balance","arguments":{}}}' \
  https://mcp.mobilesms.io/mcp
```

The sections below cover running your own instance.

## Quick Start

### Prerequisites
- Node.js 18+ (for development)
- Docker (for production deployment)

### Installation

1. **Clone and install dependencies:**
```bash
git clone https://github.com/rchanllc/mobilesms_mcp.git
cd mobilesms_mcp
npm install
```

2. **Set up environment:**
```bash
echo 'SMS_API_BASE_URL=https://mobilesms.io/webapp/api.php' > .env
```

### Running the Server

#### Development Mode
```bash
# Start with auto-reload
npm run dev:sse
```

#### Production Mode

**Option 1: Using Docker (Recommended)**
```bash
# Quick deployment
./deploy.sh

# With Docker resource cleanup
./deploy.sh --prune

# Manual Docker deployment
docker-compose up --build -d
```

**Option 2: Direct Node.js**
```bash
# Build and run
npm run build
npm run start:sse
```

The server will start on port 6900.

## API Usage

### HTTP Endpoint

**Endpoint:** `POST /mcp`  
**Authentication:** `X-API-Key` header`  
**Content-Type:** `application/json`

#### Get Balance Example:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_balance","arguments":{}}}' \
  http://localhost:6900/mcp
```

#### Generate Number Example:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"generate_number","arguments":{"service":"discord","country":"us"}}}' \
  http://localhost:6900/mcp
```

### SSE Endpoint

**Endpoint:** `GET /sse?apiKey=YOUR_API_KEY`  
**Usage:** For MCP clients that support Server-Sent Events

```bash
curl -N -H "Accept: text/event-stream" \
  "http://localhost:6900/sse?apiKey=YOUR_API_KEY"
```

## Claude Desktop Integration

### Local Installation Method

1. **Clone and build the repository:**
```bash
git clone https://github.com/rchanllc/mobilesms_mcp.git
cd mobilesms_mcp
npm install
npm run build
```

2. **Configure Claude Desktop:**

**Location of Claude Desktop config:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration (using absolute path):**
```json
{
  "mcpServers": {
    "mobilesms": {
      "command": "node",
      "args": [
        "/absolute/path/to/mobilesms_mcp/dist/index.js",
        "--api-key",
        "YOUR_API_KEY_HERE"
      ],
      "env": {
        "SMS_API_BASE_URL": "https://mobilesms.io/webapp/api.php"
      }
    }
  }
}
```

Replace:
- `/absolute/path/to/mobilesms_mcp` with the actual path where you cloned the repository
- `YOUR_API_KEY_HERE` with your actual API key from mobilesms.io

### Alternative: Using npm link (for development)

```bash
# In the mobilesms_mcp directory
npm link

# Then use in Claude Desktop config:
{
  "mcpServers": {
    "mobilesms": {
      "command": "mobilesms-mcp",
      "args": ["--api-key", "YOUR_API_KEY_HERE"],
      "env": {
        "SMS_API_BASE_URL": "https://mobilesms.io/webapp/api.php"
      }
    }
  }
}
```

## Claude CLI Integration

Use the hosted server:

```bash
claude mcp add -t sse mobilesms https://mcp.mobilesms.io/sse --sse-params '{"apiKey":"YOUR_API_KEY"}'
```

Or point at a self-hosted instance:

```bash
claude mcp add -t sse mobilesms http://localhost:6900/sse --sse-params '{"apiKey":"YOUR_API_KEY"}'
```

## Development Scripts

```bash
# Development with auto-reload
npm run dev:sse

# Build TypeScript
npm run build

# Start production server
npm run start:sse

# Docker commands
npm run docker:build          # Build Docker image
npm run docker:run            # Run container
npm run docker:compose        # Start with docker-compose
npm run docker:compose:build  # Build and start with docker-compose
npm run docker:logs           # View logs
```


## Configuration

### Environment Variables

- `SMS_API_BASE_URL` - SMS API endpoint URL (required)
- `PORT` - Server port (default: 6900)
- `NODE_ENV` - Environment mode (development/production)

### Server Configuration

The server provides:
- Built-in CORS support
- SSE-optimized endpoints
- Health check endpoints
- API key authentication

## Health Monitoring

### Health Check Endpoint
```bash
curl http://localhost:6900/health
```

### API Info Endpoint
```bash
curl http://localhost:6900/api/info
```

### Swagger Documentation
Interactive API documentation is available at:
```
http://localhost:6900/docs
```

### Docker Health Checks
Built-in Docker health checks monitor the service automatically.

## Testing

Use the included test scripts:

```bash
# Test balance call
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_balance","arguments":{}}}' \
  http://localhost:6900/mcp
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  SMS MCP Server │───▶│   SMS API       │
│                 │    │   (Port 6900)   │    │   (mobilesms.io)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Security Features

- API key authentication
- CORS configuration
- Non-root Docker user
- Input validation

## Troubleshooting

### Server won't start
```bash
# Check if port is in use
lsof -i :6900

# Check logs
docker-compose logs mobilesms_mcp
```

### API calls failing
```bash
# Test health endpoint
curl http://localhost:6900/health

# Check environment variables
docker-compose exec mobilesms_mcp env | grep SMS_API
```

### Server access issues
```bash
# Test server health
curl http://localhost:6900/health

# Check server logs
docker-compose logs mobilesms_mcp
```

## License

MIT License - see [LICENSE](LICENSE) file for details 