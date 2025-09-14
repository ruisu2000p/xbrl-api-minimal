#!/usr/bin/env node

// ===== シンプル版 MCP サーバー v3.0.0 =====
// stdout はプロトコル専用
console.log = (...args) => console.error('[LOG]', ...args);

// 起動メッセージ
console.error('[xbrl-mcp-server v3.0.0] Starting simplified version...');

import { createClient } from "@supabase/supabase-js";
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// APIキーから設定を取得
const getConfig = async () => {
  const apiKey = process.env.XBRL_API_KEY;
  const apiUrl = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app/api/v1';

  if (!apiKey) {
    // 従来の環境変数を使用
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('[ERROR] Missing environment variables');
      console.error('Set either XBRL_API_KEY or SUPABASE_URL/SUPABASE_ANON_KEY');
      process.exit(1);
    }
    return { url, key };
  }

  try {
    const response = await fetch(`${apiUrl}/config`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[ERROR] Failed to fetch config: ${response.status}`);
      process.exit(1);
    }

    const config = await response.json();
    return {
      url: config.supabaseUrl,
      key: config.supabaseAnonKey
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch config:', error.message);
    process.exit(1);
  }
};

// メイン処理
(async () => {
  try {
    // 設定を取得
    const config = await getConfig();
    const supabase = createClient(config.url, config.key);

    console.error('[INFO] Connected to Supabase');

    // MCPサーバー初期化
    const server = new Server({
      name: 'xbrl-mcp-server',
      version: '3.0.0'
    }, {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {}
      }
    });

    // 空のハンドラー
    server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));

    // ツール定義（シンプル版）
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search-documents',
          description: 'Search financial documents by company name',
          inputSchema: {
            type: 'object',
            properties: {
              company: {
                type: 'string',
                description: 'Company name or ticker code'
              },
              fiscal_year: {
                type: 'string',
                description: 'Fiscal year (e.g., FY2024)',
                enum: ['FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025']
              },
              document_type: {
                type: 'string',
                description: 'Document type filter',
                enum: ['PublicDoc', 'AuditDoc', 'all'],
                default: 'all'
              },
              limit: {
                type: 'number',
                description: 'Maximum results (default: 20)',
                default: 20
              }
            },
            required: ['company']
          }
        },
        {
          name: 'get-document',
          description: 'Get financial document content',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Document path (e.g., FY2024/S100KLVZ/PublicDoc/file.md)'
              },
              max_size: {
                type: 'number',
                description: 'Maximum size in bytes (default: 1MB)',
                default: 1000000
              }
            },
            required: ['path']
          }
        }
      ]
    }));

    // ツール実行ハンドラー
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      try {
        switch (toolName) {
          case 'search-documents': {
            const { company, fiscal_year, document_type = 'all', limit = 20 } = args;

            // Step 1: 企業を検索
            let companyQuery = supabase
              .from('companies')
              .select('id, company_name, ticker_code');

            // 企業名またはティッカーコードで検索
            if (company.match(/^\d{4}$/)) {
              // 4桁の数字はティッカーコード
              companyQuery = companyQuery.eq('ticker_code', company);
            } else {
              // それ以外は企業名で部分一致検索
              companyQuery = companyQuery.ilike('company_name', `%${company}%`);
            }

            const { data: companies, error: companyError } = await companyQuery.limit(5);

            if (companyError) {
              throw new Error(`Company search failed: ${companyError.message}`);
            }

            if (!companies || companies.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: `No companies found matching: ${company}`
                }]
              };
            }

            // Step 2: 見つかった企業の文書を検索
            const results = [];

            for (const comp of companies) {
              let docsQuery = supabase
                .from('markdown_files_metadata')
                .select('fiscal_year, file_name, file_type, storage_path, file_size')
                .eq('company_id', comp.id);

              // 年度フィルター
              if (fiscal_year) {
                docsQuery = docsQuery.eq('fiscal_year', fiscal_year);
              }

              // 文書タイプフィルター
              if (document_type !== 'all') {
                docsQuery = docsQuery.eq('file_type', document_type);
              }

              docsQuery = docsQuery.limit(limit);

              const { data: docs, error: docsError } = await docsQuery;

              if (!docsError && docs && docs.length > 0) {
                results.push({
                  company: comp.company_name,
                  ticker: comp.ticker_code,
                  company_id: comp.id,
                  documents: docs
                });
              }
            }

            if (results.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: `No documents found for: ${company}`
                }]
              };
            }

            // 結果をフォーマット
            let output = `Found ${results.reduce((sum, r) => sum + r.documents.length, 0)} documents:\n\n`;

            for (const result of results) {
              output += `## ${result.company} (${result.ticker || 'N/A'})\n`;
              output += `Company ID: ${result.company_id}\n\n`;

              // 年度ごとにグループ化
              const byYear = {};
              for (const doc of result.documents) {
                if (!byYear[doc.fiscal_year]) {
                  byYear[doc.fiscal_year] = [];
                }
                byYear[doc.fiscal_year].push(doc);
              }

              for (const [year, docs] of Object.entries(byYear)) {
                output += `### ${year}\n`;
                for (const doc of docs) {
                  const sizeKB = Math.round(doc.file_size / 1024);
                  output += `- ${doc.file_name} (${sizeKB}KB)\n`;
                  output += `  Path: ${doc.storage_path}\n`;
                }
                output += '\n';
              }
            }

            return {
              content: [{
                type: 'text',
                text: output
              }]
            };
          }

          case 'get-document': {
            const { path, max_size = 1000000 } = args;

            // パスの検証
            if (path.includes('..')) {
              throw new Error('Invalid path: traversal detected');
            }

            // ストレージから文書を取得
            const { data, error } = await supabase.storage
              .from('markdown-files')
              .download(path);

            if (error) {
              throw new Error(`Failed to download: ${error.message}`);
            }

            // サイズチェック
            const arrayBuffer = await data.arrayBuffer();
            if (arrayBuffer.byteLength > max_size) {
              throw new Error(`File too large: ${arrayBuffer.byteLength} bytes (max: ${max_size})`);
            }

            // テキストに変換
            const content = new TextDecoder().decode(arrayBuffer);

            return {
              content: [{
                type: 'text',
                text: content
              }]
            };
          }

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      } catch (error) {
        console.error(`[ERROR] Tool execution failed: ${error.message}`);
        throw error;
      }
    });

    // サーバー起動
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[INFO] MCP server started successfully');

  } catch (error) {
    console.error('[FATAL] Server initialization failed:', error);
    process.exit(1);
  }
})();