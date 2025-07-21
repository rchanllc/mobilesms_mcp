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

### Development

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd mobilesms_mcp
npm install
```

2. **Set up environment:**
```bash
echo 'SMS_API_BASE_URL=https://mobilesms.io/webapp/api.php' > .env
```

3. **Start development server:**
```bash
npm run dev:sse
```

The server will start on port 6900 with auto-reload enabled.

### Production (Docker)

1. **Quick deployment:**
```bash
./deploy.sh
```

2. **Manual deployment:**
```bash
# Build and start containers
docker-compose up --build -d

# Check logs
docker-compose logs -f mobilesms_mcp
```

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

## Production Deployment

### Docker Deployment

The included `docker-compose.yml` sets up:
- SMS MCP Server on port 6900
- Health checks and auto-restart

```bash
# Deploy with Docker
./deploy.sh

# Deploy with Docker and clean resources
./deploy.sh --prune

# Or manually
docker-compose up --build -d
```

### Direct Deployment

```bash
# Build and run directly
docker build -t mobilesms_mcp .
docker run -p 6900:6900 \
  -e SMS_API_BASE_URL=https://mobilesms.io/webapp/api.php \
  mobilesms_mcp
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