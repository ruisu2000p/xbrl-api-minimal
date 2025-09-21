#!/usr/bin/env node

// Gateway経由専用MCPクライアント
// 独自APIキーのみでGatewayにアクセス

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} = require('@modelcontextprotocol/sdk/types.js');

// Gateway設定
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway';
const CLIENT_API_KEY = process.env.CLIENT_API_KEY;

if (!CLIENT_API_KEY) {
  console.error('[ERROR] CLIENT_API_KEY environment variable is required');
  process.exit(1);
}

// Gateway APIクライアント
async function callGateway(endpoint = '', options = {}) {
  const url = `${GATEWAY_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': CLIENT_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Gateway API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// MCPサーバー初期化
const server = new Server(
  {
    name: 'gateway-xbrl-financial',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_companies',
        description: 'Get financial companies data via Gateway',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of companies to retrieve (default: 10)',
              default: 10,
            },
            select: {
              type: 'string',
              description: 'Fields to select (default: all)',
              default: '*',
            },
          },
        },
      },
      {
        name: 'get_metadata',
        description: 'Get XBRL metadata via Gateway',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of records to retrieve (default: 10)',
              default: 10,
            },
            select: {
              type: 'string',
              description: 'Fields to select (default: all)',
              default: '*',
            },
          },
        },
      },
      {
        name: 'get_config',
        description: 'Get Gateway configuration',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'gateway_health',
        description: 'Check Gateway health status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_companies': {
        const { limit = 10, select = '*' } = args;
        const params = new URLSearchParams({
          limit: limit.toString(),
          select: select.toString(),
        });
        const data = await callGateway(`/companies?${params}`);

        return {
          content: [
            {
              type: 'text',
              text: `取得した企業データ（${data.length}件）:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'get_metadata': {
        const { limit = 10, select = '*' } = args;
        const params = new URLSearchParams({
          limit: limit.toString(),
          select: select.toString(),
        });
        const data = await callGateway(`/metadata?${params}`);

        return {
          content: [
            {
              type: 'text',
              text: `取得したXBRLメタデータ（${data.length}件）:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'get_config': {
        const data = await callGateway('/config');

        return {
          content: [
            {
              type: 'text',
              text: `Gateway設定情報:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'gateway_health': {
        const data = await callGateway('/');

        return {
          content: [
            {
              type: 'text',
              text: `Gateway稼働状況:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute ${name}: ${error.message}`
    );
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[INFO] Gateway MCP Client started successfully');
}

main().catch((error) => {
  console.error('[ERROR] Failed to start server:', error);
  process.exit(1);
});