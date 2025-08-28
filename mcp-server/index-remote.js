#!/usr/bin/env node

/**
 * XBRL MCP Server - Remote/Mobile Version
 * モバイルアプリ（iOS/Android）対応版
 * Vercel APIを経由してXBRLデータにアクセス
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// APIエンドポイント（モバイル用に最適化）
const XBRL_API_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app';
const USER_API_KEY = process.env.XBRL_API_KEY || '';

// シンプルなHTTPリクエスト関数（node-fetch不要）
async function makeRequest(endpoint, params = {}) {
  try {
    const url = new URL(`${XBRL_API_URL}/api/${endpoint}`);
    
    // クエリパラメータを追加
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const headers = {
      'Content-Type': 'application/json',
    };

    if (USER_API_KEY) {
      headers['X-API-Key'] = USER_API_KEY;
    }

    // fetch APIを使用（Node.js 18+で標準）
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      let errorMessage;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || 'Unknown error';
      } else if (contentType && contentType.includes('text/html')) {
        // HTML response (404 page, etc.)
        errorMessage = `API endpoint not found (${response.status})`;
        console.error(`[ERROR] API returned HTML instead of JSON. Check endpoint: ${url.toString()}`);
      } else {
        errorMessage = await response.text();
      }
      
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[ERROR] Request to ${endpoint} failed:`, error.message);
    console.error(`[DEBUG] Full URL: ${url.toString()}`);
    throw error;
  }
}

// MCPサーバー作成
const server = new Server(
  {
    name: 'xbrl-remote-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール定義（モバイル最適化）
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_companies',
        description: '企業を検索します（企業名または業種で検索可能）',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '検索キーワード（企業名または業種）',
            },
            limit: {
              type: 'number',
              description: '最大取得件数（デフォルト: 10）',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_company_info',
        description: '企業の詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID（例: S100LJ4F）',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_documents',
        description: '企業の財務書類リストを取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            year: {
              type: 'string',
              description: '年度（例: 2021）',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'read_document',
        description: '財務書類の内容を読み込みます',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            year: {
              type: 'string',
              description: '年度',
            },
            doc_type: {
              type: 'string',
              description: '書類タイプ（例: 0101010）',
            },
          },
          required: ['company_id', 'year', 'doc_type'],
        },
      },
      {
        name: 'analyze_financials',
        description: '財務データを分析します（APIキー必要）',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            year: {
              type: 'string',
              description: '年度',
            },
          },
          required: ['company_id', 'year'],
        },
      },
    ],
  };
});

// ツール実行ハンドラー（シンプル化）
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'search_companies':
        result = await makeRequest('companies', {
          search: args.query,
          limit: args.limit || 10,
        });
        break;

      case 'get_company_info':
        result = await makeRequest(`companies/${args.company_id}`);
        break;

      case 'get_documents':
        result = await makeRequest('documents', {
          company_id: args.company_id,
          year: args.year,
        });
        break;

      case 'read_document':
        result = await makeRequest('documents/content', {
          company_id: args.company_id,
          year: args.year,
          document_type: args.doc_type,
        });
        break;

      case 'analyze_financials':
        if (!USER_API_KEY) {
          throw new Error('APIキーが必要です。環境変数XBRL_API_KEYを設定してください。');
        }
        result = await makeRequest('financial/analyze', {
          company_id: args.company_id,
          year: args.year,
        });
        break;

      default:
        throw new Error(`不明なツール: ${name}`);
    }

    // 結果を返す（モバイル用に最適化）
    const content = typeof result === 'string' 
      ? result 
      : JSON.stringify(result, null, 2);

    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  } catch (error) {
    console.error(`[ERROR] Tool execution failed: ${error.message}`);
    return {
      content: [
        {
          type: 'text',
          text: `エラー: ${error.message}`,
        },
      ],
    };
  }
});

// メイン実行関数
async function main() {
  console.error('[INFO] Starting XBRL Remote MCP Server...');
  console.error(`[INFO] API URL: ${XBRL_API_URL}`);
  console.error(`[INFO] API Key: ${USER_API_KEY ? 'Configured' : 'Not configured'}`);
  
  // 接続確認（オプション）
  if (USER_API_KEY) {
    try {
      await makeRequest('validate');
      console.error('[INFO] API Key validated successfully');
    } catch (error) {
      console.error('[WARNING] API Key validation failed:', error.message);
    }
  }

  // StdioServerTransportを使用して接続
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[INFO] XBRL Remote MCP Server is ready for mobile connections');
}

// エラーハンドリング付きで起動
main().catch((error) => {
  console.error('[FATAL] Failed to start server:', error);
  process.exit(1);
});