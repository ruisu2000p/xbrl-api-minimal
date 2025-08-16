#!/usr/bin/env node

/**
 * XBRL Financial Data MCP Server (Secure Version)
 * Claude Desktop用のMCPサーバー実装
 * APIキー認証でMarkdownデータにアクセス
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// API設定（環境変数から取得）
const API_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app/api/v1';
const API_KEY = process.env.XBRL_API_KEY;

if (!API_KEY) {
  console.error('Error: XBRL_API_KEY environment variable is required');
  console.error('Please set your API key in the Claude Desktop configuration');
  process.exit(1);
}

// MCPサーバー作成
const server = new Server(
  {
    name: 'xbrl-financial-secure',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// API リクエストヘルパー
async function makeApiRequest(endpoint, params = {}) {
  const url = new URL(`${API_URL}${endpoint}`);
  
  // クエリパラメータを追加
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `API request failed: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// ツール一覧を返す
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_markdown',
        description: 'Search for Japanese company financial documents in Markdown format. Returns document metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query (company name, code, or keyword)',
            },
            company_code: {
              type: 'string',
              description: 'Company code (e.g., 7203 for Toyota, S100L3K4)',
            },
            fiscal_year: {
              type: 'string',
              description: 'Fiscal year (e.g., 2021, 2022)',
            },
            doc_type: {
              type: 'string',
              description: 'Document type (public, audit)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 100)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'get_markdown',
        description: 'Get the full Markdown content of a specific document by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Document ID (obtained from search_markdown)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_companies',
        description: 'List all available companies with their codes and names',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
              default: 1,
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 100)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_api_status',
        description: 'Check API connection status and remaining quota',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// ツール実行を処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'search_markdown': {
        const result = await makeApiRequest('/markdown/search', {
          q: args.q,
          company_code: args.company_code,
          fiscal_year: args.fiscal_year,
          doc_type: args.doc_type,
          limit: args.limit || 20,
        });
        
        // 結果を整形
        const formattedResults = result.results.map(doc => ({
          id: doc.id,
          path: doc.path,
          title: doc.title || 'Untitled',
          company: `${doc.company_name || 'Unknown'} (${doc.company_code || 'N/A'})`,
          fiscalYear: doc.fiscal_year,
          docType: doc.doc_type,
          fileSize: doc.file_size ? `${Math.round(doc.file_size / 1024)}KB` : 'Unknown',
        }));
        
        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.count} documents:\n\n${JSON.stringify(formattedResults, null, 2)}`,
            },
          ],
        };
      }
      
      case 'get_markdown': {
        const result = await makeApiRequest(`/markdown/${args.id}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `Document: ${result.metadata.title || result.metadata.path}\n` +
                    `Company: ${result.metadata.companyName} (${result.metadata.companyCode})\n` +
                    `Fiscal Year: ${result.metadata.fiscalYear}\n` +
                    `Size: ${result.contentLength} characters\n` +
                    `---\n\n${result.content}`,
            },
          ],
        };
      }
      
      case 'list_companies': {
        // 企業一覧API（従来のcompanies APIを使用）
        const result = await makeApiRequest('/companies', {
          page: args.page || 1,
          per_page: args.per_page || 100,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'get_api_status': {
        // API接続状態を確認
        try {
          const testResult = await makeApiRequest('/markdown/search', { limit: 1 });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'connected',
                  apiUrl: API_URL,
                  keyPrefix: API_KEY.substring(0, 16) + '...',
                  message: 'API connection successful',
                  documentsAvailable: testResult.count > 0,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'error',
                  apiUrl: API_URL,
                  keyPrefix: API_KEY ? API_KEY.substring(0, 16) + '...' : 'Not set',
                  error: error.message,
                }, null, 2),
              },
            ],
          };
        }
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('XBRL MCP Server (Secure) started successfully');
  console.error(`API URL: ${API_URL}`);
  console.error(`API Key: ${API_KEY ? API_KEY.substring(0, 16) + '...' : 'Not set'}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});