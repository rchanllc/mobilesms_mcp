#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("@modelcontextprotocol/sdk/server/index");
const stdio_1 = require("@modelcontextprotocol/sdk/server/stdio");
const types_1 = require("@modelcontextprotocol/sdk/types");
const axios_1 = __importDefault(require("axios"));
class SMSMCPServer {
    constructor() {
        this.server = new index_1.Server({
            name: 'sms-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.config = {
            baseUrl: process.env.SMS_API_BASE_URL || 'https://example.com/api.php',
            apiKey: process.env.SMS_API_KEY || '',
        };
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(types_1.ListToolsRequestSchema, () => __awaiter(this, void 0, void 0, function* () {
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
        }));
        this.server.setRequestHandler(types_1.CallToolRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'generate_number':
                        return yield this.generateNumber(args);
                    case 'get_sms':
                        return yield this.getSMS(args);
                    case 'get_balance':
                        return yield this.getBalance();
                    case 'get_active_numbers':
                        return yield this.getActiveNumbers();
                    default:
                        throw new types_1.McpError(types_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                if (error instanceof types_1.McpError) {
                    throw error;
                }
                throw new types_1.McpError(types_1.ErrorCode.InternalError, `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }));
    }
    makeAPIRequest(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL(this.config.baseUrl);
            url.searchParams.append('key', this.config.apiKey);
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.append(key, value);
            }
            const response = yield axios_1.default.get(url.toString(), {
                timeout: 30000, // 30 second timeout
            });
            return response.data;
        });
    }
    generateNumber(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const { service, country, zipcode } = args;
            const params = {
                action: 'number',
                service: service,
                country: country,
            };
            if (zipcode) {
                params.zip_pass = '1';
                params.zipcode = zipcode;
            }
            const result = yield this.makeAPIRequest(params);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        });
    }
    getSMS(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const { number, service } = args;
            const params = {
                action: 'sms',
                number: number,
                service: service,
            };
            const result = yield this.makeAPIRequest(params);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        });
    }
    getBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                action: 'balance',
            };
            const result = yield this.makeAPIRequest(params);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        });
    }
    getActiveNumbers() {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                action: 'active_short',
            };
            const result = yield this.makeAPIRequest(params);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const transport = new stdio_1.StdioServerTransport();
            yield this.server.connect(transport);
            console.error('SMS MCP server running on stdio');
        });
    }
}
const server = new SMSMCPServer();
server.run().catch(console.error);
