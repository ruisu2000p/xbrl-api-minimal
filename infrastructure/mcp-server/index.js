#!/usr/bin/env node

// ===== 改善版 MCP サーバー v3.1.0 =====
// stdout はプロトコル専用
console.log = (...args) => console.error('[LOG]', ...args);

// 起動メッセージ
console.error('[xbrl-mcp-server v3.1.0] Starting improved version...');

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
      version: '3.1.0'
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

    // ツール定義（改善版）
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search-documents',
          description: 'Search financial documents by company name or ticker code',
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
                enum: ['FY2015', 'FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025']
              },
              document_type: {
                type: 'string',
                description: 'Document type filter',
                enum: ['PublicDoc', 'PublicDoc_markdown', 'AuditDoc', 'all'],
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

    // ツール実行ハンドラー（改善版）
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      try {
        switch (toolName) {
          case 'search-documents': {
            const { company, fiscal_year, document_type = 'all', limit = 20 } = args;

            console.error(`[DEBUG] Searching for: ${company}, fiscal_year: ${fiscal_year || 'all'}, type: ${document_type}`);

            // 改善版: markdown_files_metadataを直接検索
            let query = supabase
              .from('markdown_files_metadata')
              .select('*');

            // 企業名またはティッカーコードで検索
            if (company.match(/^\d{4}$/)) {
              // 4桁の数字はティッカーコード
              console.error(`[DEBUG] Searching by ticker code: ${company}`);
              query = query.eq('ticker_code', company);
            } else {
              // 企業名で柔軟な検索（複数パターン）
              console.error(`[DEBUG] Searching by company name: ${company}`);

              // 正規化した検索
              const normalizedCompany = company
                .replace(/株式会社/g, '')
                .replace(/\s+/g, '')
                .trim();

              // 複数の検索パターンを試す
              query = query.or([
                `company_name.ilike.%${company}%`,
                `company_name.ilike.%${normalizedCompany}%`,
                `company_name.ilike.株式会社${company}%`,
                `company_name.ilike.${company}株式会社%`,
                `company_name.ilike.株式会社${normalizedCompany}%`,
                `company_name.ilike.${normalizedCompany}株式会社%`
              ].join(','));
            }

            // 年度フィルター
            if (fiscal_year) {
              query = query.eq('fiscal_year', fiscal_year);
            }

            // 文書タイプフィルター（改善版）
            if (document_type !== 'all') {
              if (document_type === 'PublicDoc' || document_type === 'PublicDoc_markdown') {
                // PublicDoc関連のパスを含むものを検索
                query = query.ilike('storage_path', '%PublicDoc%');
              } else if (document_type === 'AuditDoc') {
                query = query.ilike('storage_path', '%AuditDoc%');
              }
            }

            // 制限とソート
            query = query
              .order('fiscal_year', { ascending: false })
              .order('file_name', { ascending: true })
              .limit(limit);

            const { data: documents, error } = await query;

            console.error(`[DEBUG] Query result: ${documents ? documents.length : 0} documents found`);

            if (error) {
              console.error(`[ERROR] Search failed: ${error.message}`);
              throw new Error(`Search failed: ${error.message}`);
            }

            if (!documents || documents.length === 0) {
              // フォールバック: companiesテーブルも試す（従来の方法）
              console.error(`[DEBUG] No direct results, trying companies table fallback`);

              let companyQuery = supabase
                .from('companies')
                .select('id, company_name, ticker_code');

              if (company.match(/^\d{4}$/)) {
                companyQuery = companyQuery.eq('ticker_code', company);
              } else {
                companyQuery = companyQuery.ilike('company_name', `%${company}%`);
              }

              const { data: companies } = await companyQuery.limit(5);

              if (companies && companies.length > 0) {
                console.error(`[DEBUG] Found ${companies.length} companies`);

                // 企業IDで再検索
                const companyIds = companies.map(c => c.id);
                let fallbackQuery = supabase
                  .from('markdown_files_metadata')
                  .select('*')
                  .in('company_id', companyIds);

                if (fiscal_year) {
                  fallbackQuery = fallbackQuery.eq('fiscal_year', fiscal_year);
                }

                const { data: fallbackDocs } = await fallbackQuery.limit(limit);

                if (fallbackDocs && fallbackDocs.length > 0) {
                  documents = fallbackDocs;
                } else {
                  return {
                    content: [{
                      type: 'text',
                      text: `No documents found for: ${company}`
                    }]
                  };
                }
              } else {
                return {
                  content: [{
                    type: 'text',
                    text: `No documents found for: ${company}`
                  }]
                };
              }
            }

            // 結果をグループ化
            const grouped = {};
            for (const doc of documents) {
              const key = `${doc.company_name || 'Unknown'}|${doc.ticker_code || 'N/A'}|${doc.company_id || 'unknown'}`;
              if (!grouped[key]) {
                grouped[key] = {
                  company_name: doc.company_name || 'Unknown',
                  ticker_code: doc.ticker_code || 'N/A',
                  company_id: doc.company_id || 'unknown',
                  documents: []
                };
              }
              grouped[key].documents.push(doc);
            }

            // 結果をフォーマット
            let output = `Found ${documents.length} documents:\n\n`;

            for (const group of Object.values(grouped)) {
              output += `## ${group.company_name} (${group.ticker_code})\n`;
              output += `Company ID: ${group.company_id}\n\n`;

              // 年度ごとにグループ化
              const byYear = {};
              for (const doc of group.documents) {
                const year = doc.fiscal_year || 'Unknown';
                if (!byYear[year]) {
                  byYear[year] = [];
                }
                byYear[year].push(doc);
              }

              // 年度を降順でソート
              const sortedYears = Object.keys(byYear).sort().reverse();

              for (const year of sortedYears) {
                output += `### ${year}\n`;
                for (const doc of byYear[year]) {
                  const sizeKB = doc.file_size ? Math.round(doc.file_size / 1024) : 0;
                  output += `- ${doc.file_name} (${sizeKB}KB)\n`;
                  if (doc.storage_path) {
                    output += `  Path: ${doc.storage_path}\n`;
                  }
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

            console.error(`[DEBUG] Getting document: ${path}`);

            // パスの検証
            if (path.includes('..')) {
              throw new Error('Invalid path: traversal detected');
            }

            // ストレージから文書を取得
            const { data, error } = await supabase.storage
              .from('markdown-files')
              .download(path);

            if (error) {
              console.error(`[ERROR] Download failed: ${error.message}`);
              throw new Error(`Failed to download: ${error.message}`);
            }

            // サイズチェック
            const arrayBuffer = await data.arrayBuffer();
            if (arrayBuffer.byteLength > max_size) {
              throw new Error(`File too large: ${arrayBuffer.byteLength} bytes (max: ${max_size})`);
            }

            // テキストに変換
            const content = new TextDecoder().decode(arrayBuffer);

            console.error(`[DEBUG] Document retrieved successfully: ${arrayBuffer.byteLength} bytes`);

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