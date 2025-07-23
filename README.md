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

1. **get_balance** - Get current account balance
2. **get_active_numbers** - List all active phone numbers
3. **generate_number** - Generate a new SMS number for a service/country
4. **get_sms** - Retrieve SMS messages for a specific number

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

## Claude CLI Integration

Add this MCP server to Claude CLI:

```bash
claude mcp add -t sse mobilesms-server http://localhost:6900/sse --sse-params '{"apiKey":"<YOUR_API_KEY_FROM_MOBILESMS.IO"}'
```

For production deployment, replace `http://localhost:6900` with your server URL.

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