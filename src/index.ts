#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

interface SMSAPIConfig {
  baseUrl: string;
  apiKey: string;
}

class SMSMCPServer {
  private server: Server;
  private config: SMSAPIConfig;

  constructor() {
    this.server = new Server(
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

    // Support both environment variables and command line arguments
    const apiKey = this.getApiKey();
    
    this.config = {
      baseUrl: process.env.SMS_API_BASE_URL || 'https://mobilesms.io/webapp/api.php',
      apiKey: apiKey,
    };

    if (!this.config.apiKey) {
      console.error('Warning: No API key provided. Set SMS_API_KEY environment variable or pass --api-key argument.');
    }

    this.setupToolHandlers();
  }

  private getApiKey(): string {
    // Check command line arguments first
    const args = process.argv.slice(2);
    const apiKeyIndex = args.findIndex(arg => arg === '--api-key' || arg === '-k');
    if (apiKeyIndex !== -1 && args[apiKeyIndex + 1]) {
      return args[apiKeyIndex + 1];
    }
    
    // Fall back to environment variable
    return process.env.SMS_API_KEY || '';
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_number':
            return await this.generateNumber(args as any);
          case 'get_sms':
            return await this.getSMS(args as any);
          case 'get_balance':
            return await this.getBalance();
          case 'get_active_numbers':
            return await this.getActiveNumbers();
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
  }

  private async makeAPIRequest(params: Record<string, string>) {
    const url = new URL(this.config.baseUrl);
    url.searchParams.append('key', this.config.apiKey);
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    const response = await axios.get(url.toString(), {
      timeout: 30000, // 30 second timeout
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

  private async generateNumber(args: { service: string; country: string; zipcode?: string }) {
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

    const result = await this.makeAPIRequest(params);

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

  private async getSMS(args: { number: string; service: string }) {
    const { number, service } = args;

    const params = {
      action: 'sms',
      number: number,
      service: service,
    };

    const result = await this.makeAPIRequest(params);

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

  private async getBalance() {
    const params = {
      action: 'balance',
    };

    const result = await this.makeAPIRequest(params);

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

  private async getActiveNumbers() {
    const params = {
      action: 'active_short',
    };

    const result = await this.makeAPIRequest(params);

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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SMS MCP server running on stdio');
  }
}

const server = new SMSMCPServer();
server.run().catch(console.error); 