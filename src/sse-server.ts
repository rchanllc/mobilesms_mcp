#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SMSAPIConfig {
  baseUrl: string;
  apiKey: string;
}

class SMSMCPSSEServer {
  private app: express.Application;
  private port: number;
  private baseApiUrl: string;
  private transports: Record<string, SSEServerTransport> = {};
  private serverInstances: Record<string, Server> = {};

  constructor(port: number = 6900) {
    this.port = port;
    this.app = express();
    this.baseApiUrl = process.env.SMS_API_BASE_URL || 'https://example.com/api.php';
    
    // Enable CORS and JSON parsing
    this.app.use(cors());
    this.app.use(express.json());
    
    this.setupRoutes();
  }

  private createMCPServer(apiKey: string): Server {
    const server = new Server(
      {
        name: 'mobilesms_mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const config: SMSAPIConfig = {
      baseUrl: this.baseApiUrl,
      apiKey: apiKey,
    };

    // Setup tool handlers with the specific API key
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_number',
            description: 'Generate a new SMS number for a specific service and country',
            inputSchema: {
              type: 'object',
              properties: {
                service: {
                  type: 'string',
                  description: 'The service name (e.g., discord, telegram, whatsapp)',
                },
                country: {
                  type: 'string',
                  description: 'The country code (e.g., us, uk, ca)',
                },
                zipcode: {
                  type: 'string',
                  description: 'Optional zipcode for US numbers',
                },
              },
              required: ['service', 'country'],
            },
          },
          {
            name: 'get_sms',
            description: 'Retrieve SMS messages for a specific number and service',
            inputSchema: {
              type: 'object',
              properties: {
                number: {
                  type: 'string',
                  description: 'The phone number to check for SMS messages',
                },
                service: {
                  type: 'string',
                  description: 'The service name associated with the number',
                },
              },
              required: ['number', 'service'],
            },
          },
          {
            name: 'get_balance',
            description: 'Get the current account balance',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_active_numbers',
            description: 'Get all currently active numbers (short version)',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_number':
            return await this.generateNumber(config, args as any);
          case 'get_sms':
            return await this.getSMS(config, args as any);
          case 'get_balance':
            return await this.getBalance(config);
          case 'get_active_numbers':
            return await this.getActiveNumbers(config);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    return server;
  }

  private setupRoutes() {
    // Load swagger specification dynamically
    const swaggerPath = path.join(__dirname, 'swagger.json');
    let swaggerDocument;
    
    const loadSwaggerDocument = () => {
      try {
        const swaggerFile = fs.readFileSync(swaggerPath, 'utf8');
        return JSON.parse(swaggerFile);
      } catch (error) {
        console.warn('Could not load swagger.json, API documentation will not be available');
        return null;
      }
    };
    
    swaggerDocument = loadSwaggerDocument();

    // Swagger UI endpoint
    if (swaggerDocument) {
      // Add cache-busting middleware for docs
      this.app.use('/docs', (req, res, next) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('CF-Cache-Status', 'BYPASS'); // Tell Cloudflare not to cache
        res.setHeader('Surrogate-Control', 'no-store'); // Additional CDN directive
        next();
      });
      
      this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        customSiteTitle: 'MobileSMS.io MCP Server API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
        swaggerOptions: {
          docExpansion: 'none',
          operationsSorter: 'alpha'
        }
      }));
    }

    // Root redirect to docs
    this.app.get('/', (req, res) => {
      res.redirect('/docs');
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        server: 'SMS MCP SSE Server'
      });
    });

    // API info endpoint
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'SMS MCP SSE Server',
        version: '1.0.0',
        transport: 'SSE + HTTP',
        endpoints: {
          sse: '/sse',
          messages: '/messages',
          http: '/mcp',
          health: '/health',
          docs: '/docs',
          tools: '/tools',
          setup: '/setup/guide',
          config: '/setup/claude-code-config'
        },
        usage: {
          sse: 'Connect to /sse?apiKey=your-mobilesms-api-key',
          messages: 'Client POSTs to /messages?sessionId=<id> after SSE connection',
          http: 'POST to /mcp with JSON-RPC messages and X-API-Key header (MobileSMS.io API key)',
          docs: 'Visit /docs for API documentation'
        }
      });
    });

    // Tools endpoint
    this.app.get('/tools', (req, res) => {
      res.json({
        tools: [
          {
            name: 'generate_number',
            description: 'Generate a new SMS number for a specific service and country',
            parameters: {
              service: {
                type: 'string',
                description: 'The service name (e.g., discord, telegram, whatsapp)',
                required: true
              },
              country: {
                type: 'string', 
                description: 'The country code (e.g., us, uk, ca)',
                required: true
              },
              zipcode: {
                type: 'string',
                description: 'Optional zipcode for US numbers',
                required: false
              }
            },
            example: {
              service: 'discord',
              country: 'us',
              zipcode: '10001'
            }
          },
          {
            name: 'get_sms',
            description: 'Retrieve SMS messages for a specific number and service',
            parameters: {
              number: {
                type: 'string',
                description: 'The phone number to check for SMS messages',
                required: true
              },
              service: {
                type: 'string',
                description: 'The service name associated with the number',
                required: true
              }
            },
            example: {
              number: '5551234567',
              service: 'discord'
            }
          },
          {
            name: 'get_balance',
            description: 'Get the current account balance',
            parameters: {},
            example: {}
          },
          {
            name: 'get_active_numbers',
            description: 'Get all currently active numbers (short version)',
            parameters: {},
            example: {}
          }
        ]
      });
    });

    // Setup guide endpoint
    this.app.get('/setup/guide', (req, res) => {
      res.json({
        claude_code: {
          description: 'To use this MCP server with Claude Code CLI, run the following command in your terminal',
          command: 'claude mcp add -t sse mobilesms-server "https://mcp.mobilesms.io/sse?apiKey=YOUR_MOBILESMS_API_KEY"',
          steps: [
            '1. Get your SMS API key from your MobileSMS.io account',
            '2. Open your terminal',
            '3. Run the command above, replacing YOUR_SMS_API_KEY with your actual MobileSMS.io API key', 
            '4. The SMS tools will now be available in your Claude Code sessions'
          ],
          note: 'Make sure you have Claude Code CLI installed and configured before running this command'
        },
        direct_api: {
          description: 'Use the HTTP endpoint for direct API integration',
          endpoints: {
            base_url: 'https://mcp.mobilesms.io',
            mcp_endpoint: '/mcp',
            sse_endpoint: '/sse'
          },
          authentication: {
            http: 'Use X-API-Key header with YOUR_MOBILESMS_API_KEY',
            sse: 'Pass apiKey as query parameter: /sse?apiKey=YOUR_MOBILESMS_API_KEY'
          },
          examples: {
            curl_example: 'curl -X POST https://mcp.mobilesms.io/mcp -H "Content-Type: application/json" -H "X-API-Key: YOUR_MOBILESMS_API_KEY" -d \'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_balance","arguments":{}}}\'',
            javascript_example: 'fetch("https://mcp.mobilesms.io/mcp", { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": "YOUR_MOBILESMS_API_KEY" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_balance", arguments: {} } }) })'
          }
        }
      });
    });

    // Claude Code CLI setup command endpoint
    this.app.get('/setup/claude-code-config', (req, res) => {
      const setup = {
        command: 'claude mcp add -t sse mobilesms-server "https://mcp.mobilesms.io/sse?apiKey=YOUR_MOBILESMS_API_KEY"',
        description: 'Run this command in your terminal to add the MobileSMS MCP server to Claude Code CLI',
        steps: [
          '1. Get your SMS API key from your MobileSMS.io account',
          '2. Open your terminal', 
          '3. Run the command above, replacing YOUR_MOBILESMS_API_KEY with your actual MobileSMS.io API key',
          '4. The SMS tools will now be available in your Claude Code sessions'
        ],
        note: 'Make sure you have Claude Code CLI installed and configured before running this command'
      };

      res.setHeader('Content-Type', 'application/json');
      res.json(setup);
    });

    // HTTP endpoint for direct MCP calls (for remote usage)
    this.app.post('/mcp', async (req, res) => {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        res.status(400).json({ 
          error: 'MobileSMS.io API key required. Use X-API-Key header' 
        });
        return;
      }

      const message = req.body;
      
      if (!message || !message.jsonrpc || !message.method) {
        res.status(400).json({
          error: 'Invalid JSON-RPC message. Required: jsonrpc, method, id'
        });
        return;
      }

      console.log(`📡 HTTP MCP call: ${message.method} with API key: ${apiKey.substring(0, 8)}...`);

      try {
        const config: SMSAPIConfig = {
          baseUrl: this.baseApiUrl,
          apiKey: apiKey,
        };

        let result;

        switch (message.method) {
          case 'tools/list':
            result = {
              jsonrpc: '2.0',
              id: message.id,
              result: {
                tools: [
                  {
                    name: 'generate_number',
                    description: 'Generate a new SMS number for a specific service and country',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        service: {
                          type: 'string',
                          description: 'The service name (e.g., discord, telegram, whatsapp)',
                        },
                        country: {
                          type: 'string',
                          description: 'The country code (e.g., us, uk, ca)',
                        },
                        zipcode: {
                          type: 'string',
                          description: 'Optional zipcode for US numbers',
                        },
                      },
                      required: ['service', 'country'],
                    },
                  },
                  {
                    name: 'get_sms',
                    description: 'Retrieve SMS messages for a specific number and service',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        number: {
                          type: 'string',
                          description: 'The phone number to check for SMS messages',
                        },
                        service: {
                          type: 'string',
                          description: 'The service name associated with the number',
                        },
                      },
                      required: ['number', 'service'],
                    },
                  },
                  {
                    name: 'get_balance',
                    description: 'Get the current account balance',
                    inputSchema: {
                      type: 'object',
                      properties: {},
                    },
                  },
                  {
                    name: 'get_active_numbers',
                    description: 'Get all currently active numbers (short version)',
                    inputSchema: {
                      type: 'object',
                      properties: {},
                    },
                  },
                ],
              }
            };
            break;

          case 'tools/call':
            const { name, arguments: args } = message.params;
            let toolResult;

            switch (name) {
              case 'generate_number':
                toolResult = await this.generateNumber(config, args as any);
                break;
              case 'get_sms':
                toolResult = await this.getSMS(config, args as any);
                break;
              case 'get_balance':
                toolResult = await this.getBalance(config);
                break;
              case 'get_active_numbers':
                toolResult = await this.getActiveNumbers(config);
                break;
              default:
                throw new Error(`Unknown tool: ${name}`);
            }

            result = {
              jsonrpc: '2.0',
              id: message.id,
              result: toolResult
            };
            break;

          default:
            result = {
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32601,
                message: `Method not found: ${message.method}`
              }
            };
        }

        res.json(result);

      } catch (error) {
        console.error('Error handling MCP call:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: `Internal error: ${error instanceof Error ? error.message : String(error)}`
          }
        });
      }
    });


    // SSE endpoint for establishing the SSE stream
    this.app.get('/sse', async (req, res) => {
      const apiKey = req.query.apiKey as string;
      
      if (!apiKey) {
        res.status(400).json({ 
          error: 'API key required. Use: /sse?apiKey=your-api-key' 
        });
        return;
      }

      console.log(`📡 New MCP SSE connection with API key: ${apiKey.substring(0, 8)}...`);

      try {
        // Create SSE transport with the messages endpoint
        const transport = new SSEServerTransport('/messages', res);
        
        // Store the transport and create server instance
        const sessionId = transport.sessionId;
        this.transports[sessionId] = transport;
        
        // Create a new MCP server instance for this connection with the provided API key
        const mcpServer = this.createMCPServer(apiKey);
        this.serverInstances[sessionId] = mcpServer;
        
        // Set up onclose handler to clean up
        transport.onclose = () => {
          console.log(`📡 SSE transport closed for session ${sessionId}`);
          delete this.transports[sessionId];
          delete this.serverInstances[sessionId];
        };
        
        // Connect the MCP server to this transport
        await mcpServer.connect(transport);
        console.log(`✅ Established SSE stream with session ID: ${sessionId}`);
        
      } catch (error) {
        console.error('Error establishing SSE stream:', error);
        if (!res.headersSent) {
          res.status(500).send('Error establishing SSE stream');
        }
      }
    });

    // Messages endpoint for receiving client JSON-RPC requests
    this.app.post('/messages', async (req, res) => {
      console.log('📨 Received POST request to /messages');
      
      // Extract session ID from URL query parameter
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        console.error('No session ID provided in request URL');
        res.status(400).json({ error: 'Missing sessionId parameter' });
        return;
      }
      
      const transport = this.transports[sessionId];
      if (!transport) {
        console.error(`No active transport found for session ID: ${sessionId}`);
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      
      try {
        // Handle the POST message with the transport
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error handling request' });
        }
      }
    });
  }

  private async makeAPIRequest(config: SMSAPIConfig, params: Record<string, string>) {
    const url = new URL(config.baseUrl);
    url.searchParams.append('key', config.apiKey);
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    const response = await axios.get(url.toString(), {
      timeout: 30000,
    });

    // If the API returns a string that looks like JSON, parse it
    let data = response.data;
    if (typeof data === 'string' && data.trim().startsWith('{')) {
      try {
        data = JSON.parse(data);
      } catch (e) {
        // If parsing fails, return the string as-is
      }
    }

    return data;
  }

  private async generateNumber(config: SMSAPIConfig, args: { service: string; country: string; zipcode?: string }) {
    const { service, country, zipcode } = args;

    const params: Record<string, string> = {
      action: 'number',
      service: service,
      country: country,
    };

    if (zipcode) {
      params.zip_pass = '1';
      params.zipcode = zipcode;
    }

    const result = await this.makeAPIRequest(config, params);

    // If result is already a string (raw text response), use it as-is
    // If it's an object, stringify it for the text content
    const textContent = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    
    return {
      content: [
        {
          type: 'text',
          text: textContent,
        },
      ],
    };
  }

  private async getSMS(config: SMSAPIConfig, args: { number: string; service: string }) {
    const { number, service } = args;

    const params = {
      action: 'sms',
      number: number,
      service: service,
    };

    const result = await this.makeAPIRequest(config, params);

    // If result is already a string (raw text response), use it as-is
    // If it's an object, stringify it for the text content
    const textContent = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    
    return {
      content: [
        {
          type: 'text',
          text: textContent,
        },
      ],
    };
  }

  private async getBalance(config: SMSAPIConfig) {
    const params = {
      action: 'balance',
    };

    const result = await this.makeAPIRequest(config, params);

    // If result is already a string (raw text response), use it as-is
    // If it's an object, stringify it for the text content
    const textContent = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    
    return {
      content: [
        {
          type: 'text',
          text: textContent,
        },
      ],
    };
  }

  private async getActiveNumbers(config: SMSAPIConfig) {
    const params = {
      action: 'active_short',
    };

    const result = await this.makeAPIRequest(config, params);

    // If result is already a string (raw text response), use it as-is
    // If it's an object, stringify it for the text content
    const textContent = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    
    return {
      content: [
        {
          type: 'text',
          text: textContent,
        },
      ],
    };
  }

  async start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 SMS MCP SSE Server running on port ${this.port}`);
      console.log(`📡 MCP SSE endpoint: http://localhost:${this.port}/sse?apiKey=YOUR_API_KEY`);
      console.log(`🔧 Health check: http://localhost:${this.port}/health`);
      console.log(`📚 API info: http://localhost:${this.port}/api/info`);
      console.log(`📖 API docs: http://localhost:${this.port}/docs`);
      console.log(`\n📋 Usage:`);
      console.log(`   Connect MCP clients to: http://localhost:${this.port}/sse?apiKey=your-api-key`);
      console.log(`   View API documentation at: http://localhost:${this.port}/docs`);
    });
  }
}

// Parse command line arguments for port
const port = process.argv[2] ? parseInt(process.argv[2]) : 6900;

const server = new SMSMCPSSEServer(port);
server.start().catch(console.error);

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  
  // Close all active transports
  for (const sessionId in server['transports']) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await server['transports'][sessionId].close();
      delete server['transports'][sessionId];
      delete server['serverInstances'][sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  console.log('Server shutdown complete');
  process.exit(0);
}); 