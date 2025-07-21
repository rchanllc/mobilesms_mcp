# Setting up SMS MCP Server with Claude CLI

## Prerequisites
- Claude CLI installed
- SMS MCP server running (locally or remotely)
- Valid SMS API key from your SMS provider

## Step 1: Add the MCP server to Claude CLI

Use the `claude mcp add` command with `-t sse` for SSE transport:

```bash
# For local server
claude mcp add -t sse sms-server "http://localhost:6900/sse?apiKey=YOUR_SMS_API_KEY"

# For remote server (example)
claude mcp add -t sse sms-server "https://your-domain.com/sse?apiKey=YOUR_SMS_API_KEY"
```

Note: The API key is passed as a URL query parameter.

## Step 2: Verify the MCP server was added

```bash
claude mcp list
```

You should see:
```
Available MCP servers:
- sms-server (http://localhost:6900/sse)
```

## Step 3: Start using the SMS tools in Claude

Now you can use the SMS tools in your Claude conversations:

### Example: Check your balance
```
claude "Check my SMS account balance"
```

### Example: Generate a phone number
```
claude "Generate a US phone number for Discord verification"
```

### Example: Check SMS messages
```
claude "Check if there are any SMS messages for number +1234567890 on Discord"
```

### Example: Interactive session
```bash
# Start an interactive session
claude

# Then in the conversation:
> Generate a new UK phone number for WhatsApp
> Check the SMS messages for that number
> Show me all my active numbers
```

## Available Tools

The SMS MCP server provides these tools:

1. **generate_number** - Generate a new SMS number
   - Parameters: service (e.g., discord, telegram), country (e.g., us, uk), zipcode (optional)

2. **get_sms** - Retrieve SMS messages
   - Parameters: number, service

3. **get_balance** - Check account balance
   - No parameters required

4. **get_active_numbers** - List all active numbers
   - No parameters required

## Managing MCP Servers

### Remove an MCP server
```bash
claude mcp remove sms-server
```

### Update an MCP server
```bash
# Remove and re-add with new parameters
claude mcp remove sms-server
claude mcp add -t sse sms-server "http://localhost:6900/sse?apiKey=NEW_API_KEY"
```

## Troubleshooting

### Check if the server is running
```bash
curl http://localhost:6900/health
```

### View server logs (if using Docker)
```bash
sudo docker-compose logs -f mobilesms_mcp
```

### Test the connection manually
```bash
# This should show the endpoint event
curl -N "http://localhost:6900/sse?apiKey=YOUR_API_KEY" | head -5
```

## Environment Variables Alternative

You can also set the API key as an environment variable:

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export SMS_API_KEY="your-api-key"

# Then add the MCP without hardcoding the key
claude mcp add -t sse sms-server "http://localhost:6900/sse?apiKey=$SMS_API_KEY"
```