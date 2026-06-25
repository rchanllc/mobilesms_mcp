// Shared tool definitions and request-param mapping used by BOTH the stdio
// server (index.ts) and the SSE/HTTP server (sse-server.ts), so the tool list
// and dispatch logic cannot drift between the two transports.

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'generate_number',
    description: 'Generate a new short-term SMS number for a specific service and country',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'The service name (e.g., discord, telegram, whatsapp)' },
        country: { type: 'string', description: 'The country code (e.g., us, uk, ca)' },
      },
      required: ['service', 'country'],
    },
  },
  {
    name: 'get_sms',
    description: 'Retrieve SMS messages for a specific short-term number and service',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'string', description: 'The phone number to check for SMS messages' },
        service: { type: 'string', description: 'The service name associated with the number' },
      },
      required: ['number', 'service'],
    },
  },
  {
    name: 'get_balance',
    description: 'Get the current account balance',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_active_numbers',
    description: 'Get all currently active short-term numbers (short version)',
    inputSchema: { type: 'object', properties: {} },
  },

  // ---- Long Term Numbers (LTN) ----
  {
    name: 'ltn_get_numbers',
    description: 'List your long-term numbers (LTN) with their number_id, phone number, expiry and status',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'ltn_rent_cost',
    description: 'Get the price to rent a US long-term number before purchasing (includes any account discount). US numbers only.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: '"all" for the all-services premium number, or a specific service name' },
        days: { type: 'number', description: 'Rental duration in days. Specific service: 7/14/30/60/90. "all": 7/30/90/180' },
      },
      required: ['service', 'days'],
    },
  },
  {
    name: 'ltn_rent',
    description: 'Rent a US long-term number, charged to account credit. Instant fulfilment only: returns {"status":0,"message":"out of stock"} (no charge) if a number is not immediately available. Returns a number_id on success. US numbers only.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: '"all" for the all-services premium number, or a specific service name' },
        days: { type: 'number', description: 'Rental duration in days. Specific service: 7/14/30/60/90. "all": 7/30/90/180' },
      },
      required: ['service', 'days'],
    },
  },
  {
    name: 'ltn_extend',
    description: 'Extend/renew one of your active US long-term numbers, charged to account credit. Refunded automatically if the renewal cannot be completed.',
    inputSchema: {
      type: 'object',
      properties: {
        number_id: { type: 'string', description: 'The number_id returned by ltn_rent / ltn_get_numbers' },
        days: { type: 'number', description: 'Renewal length in days (7/14/30/90, depending on the number\'s rental type)' },
      },
      required: ['number_id', 'days'],
    },
  },
  {
    name: 'ltn_get_sms',
    description: 'Get received SMS history for one of your long-term numbers',
    inputSchema: {
      type: 'object',
      properties: {
        number_id: { type: 'string', description: 'The number_id returned by ltn_rent / ltn_get_numbers' },
      },
      required: ['number_id'],
    },
  },
];

/**
 * Map a tool name + arguments to the SMS API query params (minus the API key,
 * which makeAPIRequest appends). Returns null for an unknown tool.
 */
export function buildParams(name: string, args: any = {}): Record<string, string> | null {
  switch (name) {
    case 'generate_number':
      return { action: 'number', service: String(args.service), country: String(args.country) };
    case 'get_sms':
      return { action: 'sms', number: String(args.number), service: String(args.service) };
    case 'get_balance':
      return { action: 'balance' };
    case 'get_active_numbers':
      return { action: 'active_short' };
    case 'ltn_get_numbers':
      return { action: 'ltn_getnumbers' };
    case 'ltn_rent_cost':
      return { action: 'ltn_rent_cost', country: 'us', service: String(args.service), days: String(args.days) };
    case 'ltn_rent':
      return { action: 'ltn_rent', country: 'us', service: String(args.service), days: String(args.days) };
    case 'ltn_extend':
      return { action: 'ltn_extend', number_id: String(args.number_id), days: String(args.days) };
    case 'ltn_get_sms':
      return { action: 'ltn_smshistory', number_id: String(args.number_id) };
    default:
      return null;
  }
}

/** Wrap an SMS API result into the MCP content envelope. */
export function formatResult(result: any) {
  const textContent = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
  return { content: [{ type: 'text', text: textContent }] };
}

/** Derive the REST /tools listing shape from the canonical tool definitions. */
export function toolsRestListing() {
  return TOOL_DEFS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: Object.fromEntries(
      Object.entries(t.inputSchema.properties).map(([key, prop]) => [
        key,
        {
          type: prop.type,
          description: prop.description,
          required: (t.inputSchema.required || []).includes(key),
        },
      ])
    ),
  }));
}
