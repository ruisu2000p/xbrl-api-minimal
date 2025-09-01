/**
 * XBRL Financial Data MCP Server
 * markdown_files_metadataテーブル統合版
 * 
 * このMCPサーバーは、日本の上場企業101,983件の財務文書へのアクセスを提供します。
 * FY2015-FY2025のデータに対応しています。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from 'node-fetch';

// APIの設定（ローカル優先、本番フォールバック）
const API_URL = process.env.XBRL_API_URL || 'http://localhost:3005/api/v1';
const API_KEY = process.env.XBRL_API_KEY || 'xbrl_test_key_123';

// APIリクエストを送信する共通関数
async function makeApiRequest(endpoint, params = {}, method = 'GET', body = null) {
  const url = new URL(`${API_URL}${endpoint}`);
  
  // GETの場合はクエリパラメータを追加
  if (method === 'GET') {
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
  }

  const options = {
    method,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);

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
        name: "search_financial_documents",
        description: "財務文書を検索します（企業ID、年度、文書タイプで絞り込み可能）",
        inputSchema: {
          type: "object",
          properties: {
            company_id: {
              type: "string",
              description: "企業ID（例: S100L3K4）",
            },
            fiscal_year: {
              type: "number",
              description: "会計年度（例: 2024）",
            },
            document_type: {
              type: "string",
              description: "文書タイプ（PublicDoc/AuditDoc）",
            },
            section_type: {
              type: "string",
              description: "セクションタイプ（例: company_overview, business_overview）",
            },
            limit: {
              type: "number",
              description: "取得件数（デフォルト: 10、最大: 100）",
              default: 10,
            },
          },
        },
      },
      {
        name: "get_document_content",
        description: "特定の財務文書の内容を取得します",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "ファイルパス（例: FY2024/S100L3K4/PublicDoc_markdown/...）",
            },
          },
          required: ["file_path"],
        },
      },
      {
        name: "get_company_overview",
        description: "企業の財務文書概要を取得します（全年度の文書一覧）",
        inputSchema: {
          type: "object",
          properties: {
            company_id: {
              type: "string",
              description: "企業ID（例: S100L3K4）",
            },
          },
          required: ["company_id"],
        },
      },
      {
        name: "get_year_summary",
        description: "特定年度の全企業サマリーを取得します",
        inputSchema: {
          type: "object",
          properties: {
            fiscal_year: {
              type: "number",
              description: "会計年度（例: 2024）",
            },
            limit: {
              type: "number",
              description: "取得企業数（デフォルト: 20）",
              default: 20,
            },
          },
          required: ["fiscal_year"],
        },
      },
      {
        name: "get_database_stats",
        description: "データベース統計情報を取得します（総ファイル数、年度別集計など）",
        inputSchema: {
          type: "object",
          properties: {},
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
      case "search_financial_documents": {
        const data = await makeApiRequest('/markdown-files-optimized', {
          company_id: args.company_id,
          fiscal_year: args.fiscal_year,
          document_type: args.document_type,
          section_type: args.section_type,
          limit: args.limit || 10,
        });
        
        // 結果を整形
        const result = {
          total: data.pagination?.total || 0,
          count: data.data?.length || 0,
          documents: data.data?.map(doc => ({
            id: doc.id,
            company_id: doc.company_id,
            fiscal_year: doc.fiscal_year,
            document_type: doc.document_type,
            section_type: doc.section_type,
            file_path: doc.file_path,
            file_size: doc.file_size
          })) || []
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_document_content": {
        // POSTリクエストでコンテンツを取得
        const data = await makeApiRequest('/markdown-files', {}, 'POST', {
          file_path: args.file_path,
          content_only: true
        });
        
        // ダウンロードURLからコンテンツを取得
        if (data.downloadUrl) {
          const contentResponse = await fetch(data.downloadUrl);
          const content = await contentResponse.text();
          
          return {
            content: [
              {
                type: "text",
                text: content.substring(0, 50000), // 最初の50,000文字まで
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: "Content not available",
            },
          ],
        };
      }

      case "get_company_overview": {
        const data = await makeApiRequest('/markdown-files-optimized', {
          company_id: args.company_id,
          limit: 100,
        });
        
        // 年度別に整理
        const byYear = {};
        data.data?.forEach(doc => {
          const year = doc.fiscal_year || 'unknown';
          if (!byYear[year]) {
            byYear[year] = {
              PublicDoc: [],
              AuditDoc: []
            };
          }
          const docType = doc.document_type || 'unknown';
          if (byYear[year][docType]) {
            byYear[year][docType].push(doc.section_type || doc.file_name);
          }
        });
        
        const overview = {
          company_id: args.company_id,
          total_documents: data.data?.length || 0,
          fiscal_years: Object.keys(byYear).sort(),
          documents_by_year: byYear
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(overview, null, 2),
            },
          ],
        };
      }

      case "get_year_summary": {
        const data = await makeApiRequest('/markdown-files-optimized', {
          fiscal_year: args.fiscal_year,
          limit: args.limit || 20,
        });
        
        // 企業別に集計
        const companies = {};
        data.data?.forEach(doc => {
          const companyId = doc.company_id;
          if (!companies[companyId]) {
            companies[companyId] = {
              documents: 0,
              types: new Set()
            };
          }
          companies[companyId].documents++;
          companies[companyId].types.add(doc.document_type);
        });
        
        const summary = {
          fiscal_year: args.fiscal_year,
          total_documents: data.pagination?.total || 0,
          companies_count: Object.keys(companies).length,
          companies: Object.entries(companies).map(([id, info]) => ({
            company_id: id,
            document_count: info.documents,
            document_types: Array.from(info.types)
          }))
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case "get_database_stats": {
        // 各年度のデータを取得
        const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
        const stats = {
          total_documents: 0,
          by_year: {},
          available_years: []
        };
        
        for (const year of years) {
          try {
            const data = await makeApiRequest('/markdown-files-optimized', {
              fiscal_year: year,
              limit: 1
            });
            
            if (data.pagination?.total > 0) {
              stats.by_year[`FY${year}`] = data.pagination.total;
              stats.total_documents += data.pagination.total;
              stats.available_years.push(year);
            }
          } catch (error) {
            // Skip if year has no data
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
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