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
import { TOOL_DEFS, buildParams, formatResult } from './tools.js';

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
      return { tools: TOOL_DEFS };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const params = buildParams(name, args);
        if (!params) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
        const result = await this.makeAPIRequest(params);
        return formatResult(result);
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SMS MCP server running on stdio');
  }
}

const server = new SMSMCPServer();
server.run().catch(console.error); 