#!/bin/bash

# SMS MCP Server Deployment Script

set -e

# Parse command line arguments
PRUNE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --prune) PRUNE=true ;;
        -h|--help) 
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --prune    Clean up Docker resources (containers, images, volumes)"
            echo "  -h, --help Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo "🚀 Deploying SMS MCP Server..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << EOF
SMS_API_BASE_URL=https://mobilesms.io/webapp/api.php
NODE_ENV=production
PORT=6900
EOF
    echo "📝 Please edit .env file with your configuration"
fi

# Dependencies and the TypeScript build happen inside the Docker build
# (Dockerfile runs `npm ci` from the committed package-lock.json, then
# `npm run build`). Nothing is installed or built on the host, so the
# lockfile is never rewritten here and `git pull` stays conflict-free.

echo "🛑 Stopping existing containers..."
sudo docker compose down

if [ "$PRUNE" = true ]; then
    echo "🧹 Cleaning up old Docker resources..."
    # Remove old containers
    sudo docker container prune -f

    # Remove old images (keep only latest)
    sudo docker image prune -f

    # Remove any dangling volumes
    sudo docker volume prune -f

    # Remove specific SMS MCP server images to force complete rebuild
    sudo docker rmi $(sudo docker images "*mobilesms_mcp*" -q) 2>/dev/null || echo "No SMS MCP images found"

    # Also remove any images with the project name
    sudo docker rmi $(sudo docker images "*mobilesms*" -q) 2>/dev/null || echo "No MobileSMS images found"

    # Clear build cache to ensure completely fresh build
    sudo docker builder prune -f
fi

echo "🔨 Building and starting containers..."
if [ "$PRUNE" = true ]; then
    # Use --no-cache to ensure fresh build when pruning
    sudo docker compose build --no-cache
else
    # Normal build without forcing cache invalidation
    sudo docker compose build
fi
sudo docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 5

echo "🏥 Checking service health..."
if curl -s http://localhost:6900/health > /dev/null; then
    echo "✅ Service is healthy and running!"
    echo "🌐 Available endpoints:"
    echo "   📡 SSE: http://localhost:6900/sse?apiKey=YOUR_MOBILESMS_API_KEY"
    echo "   📋 API Info: http://localhost:6900/api/info"
    echo "   📖 Docs: http://localhost:6900/docs"
    echo "   🏥 Health: http://localhost:6900/health"
else
    echo "❌ Service health check failed. Check logs with:"
    echo "   sudo docker compose logs -f"
    exit 1
fi

echo "🎉 Deployment completed successfully!" 