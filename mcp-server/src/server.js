/**
 * XBRL API MCP Server
 * 
 * このMCPサーバーは、XBRL財務データAPIへのアクセスを提供します。
 * Claude Desktopから財務データの検索・取得が可能になります。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from 'node-fetch';

// APIの設定
const API_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app/api/v1';
const API_KEY = process.env.XBRL_API_KEY || '';

// APIリクエストを送信する共通関数
async function makeApiRequest(endpoint, params = {}) {
  const url = new URL(`${API_URL}${endpoint}`);
  
  // クエリパラメータを追加
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

// MCPサーバーの作成
const server = new Server(
  {
    name: "xbrl-api-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 利用可能なツールのリスト
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_companies",
        description: "企業名、証券コード、業種で企業を検索します",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "検索クエリ（企業名、証券コード）",
            },
            industry: {
              type: "string",
              description: "業種で絞り込み",
            },
            limit: {
              type: "number",
              description: "取得件数（デフォルト: 10）",
              default: 10,
            },
          },
        },
      },
      {
        name: "get_company_details",
        description: "特定企業の詳細情報を取得します",
        inputSchema: {
          type: "object",
          properties: {
            company_id: {
              type: "string",
              description: "企業ID（証券コードまたは内部ID）",
            },
          },
          required: ["company_id"],
        },
      },
      {
        name: "get_financial_data",
        description: "企業の財務データを取得します",
        inputSchema: {
          type: "object",
          properties: {
            company_id: {
              type: "string",
              description: "企業ID（証券コード）",
            },
            year: {
              type: "number",
              description: "対象年度",
            },
            section: {
              type: "string",
              description: "取得するセクション（例: 業績、財務状態）",
            },
          },
          required: ["company_id"],
        },
      },
      {
        name: "list_companies",
        description: "企業一覧を取得します",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "ページ番号（デフォルト: 1）",
              default: 1,
            },
            limit: {
              type: "number",
              description: "1ページあたりの件数（デフォルト: 20）",
              default: 20,
            },
          },
        },
      },
    ],
  };
});

// ツールの実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_companies": {
        const data = await makeApiRequest('/companies', {
          q: args.query,
          industry: args.industry,
          limit: args.limit || 10,
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_company_details": {
        const data = await makeApiRequest(`/companies/${args.company_id}`);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_financial_data": {
        const data = await makeApiRequest(`/financial-data`, {
          company_id: args.company_id,
          year: args.year,
          section: args.section,
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "list_companies": {
        const data = await makeApiRequest('/companies', {
          page: args.page || 1,
          limit: args.limit || 20,
        });
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// サーバーの起動
export async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("XBRL MCP Server started");
}

// 直接実行された場合のみ起動
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}