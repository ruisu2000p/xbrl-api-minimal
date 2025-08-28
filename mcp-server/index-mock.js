#!/usr/bin/env node

/**
 * XBRL MCP Server - Mock Mode
 * APIが利用できない場合のモックデータ版
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// モックデータ
const MOCK_COMPANIES = [
  { id: 'S100LJ4F', name: '亀田製菓株式会社', industry: '食料品', ticker: '2220' },
  { id: 'S100L3K4', name: '株式会社タカショー', industry: '卸売業', ticker: '7590' },
  { id: 'S100LMNA', name: 'トヨタ自動車株式会社', industry: '輸送用機器', ticker: '7203' },
  { id: 'S100M123', name: '株式会社ファーストリテイリング', industry: '小売業', ticker: '9983' },
  { id: 'S100N456', name: 'ソフトバンクグループ株式会社', industry: '情報・通信', ticker: '9984' }
];

const server = new Server(
  {
    name: 'xbrl-mock-mcp',
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
        name: 'search_companies',
        description: '企業を検索します（モックデータ）',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '検索キーワード' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_company_info',
        description: '企業情報を取得します（モックデータ）',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'string', description: '企業ID' }
          },
          required: ['company_id']
        }
      },
      {
        name: 'list_all_companies',
        description: 'すべての企業を一覧表示（モックデータ）',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'search_companies':
        result = MOCK_COMPANIES.filter(c => 
          c.name.includes(args.query) || 
          c.industry.includes(args.query)
        );
        break;

      case 'get_company_info':
        result = MOCK_COMPANIES.find(c => c.id === args.company_id);
        if (!result) {
          throw new Error(`Company ${args.company_id} not found`);
        }
        break;

      case 'list_all_companies':
        result = MOCK_COMPANIES;
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result,
            mode: 'mock',
            message: '⚠️ This is mock data. Real API is currently unavailable.'
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: error.message,
            mode: 'mock'
          }, null, 2)
        }
      ]
    };
  }
});

// メイン実行
async function main() {
  console.error('[INFO] Starting XBRL Mock MCP Server...');
  console.error('[WARNING] Running in MOCK mode - Real API is unavailable');
  console.error('[INFO] Mock data includes 5 sample companies');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[INFO] Mock server is ready');
}

main().catch((error) => {
  console.error('[FATAL] Failed to start:', error);
  process.exit(1);
});