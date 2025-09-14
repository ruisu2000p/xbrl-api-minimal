#!/usr/bin/env node

// ===== デバッグバージョン 2.1.1 =====
console.log = (...args) => console.error('[LOG]', ...args);
console.error('[shared-supabase-mcp-minimal v2.1.1 DEBUG] Starting...');

import minimist from "minimist";
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

// APIキーによる設定取得
const getConfigFromApiKey = async () => {
  const apiKey = process.env.XBRL_API_KEY;
  const apiUrl = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app/api/v1';

  if (!apiKey) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('[ERROR] Missing required environment variables');
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
      const errorText = await response.text();
      console.error(`[ERROR] Failed to fetch config: ${response.status}`);
      console.error(`[ERROR] Response: ${errorText}`);
      process.exit(1);
    }

    const config = await response.json();
    console.error('[INFO] Config fetched:', JSON.stringify(config, null, 2));

    return {
      url: config.supabaseUrl,
      key: config.supabaseAnonKey
    };

  } catch (error) {
    console.error('[ERROR] Failed to fetch config:', error);
    process.exit(1);
  }
};

// CLIパラメータ解析
const argv = minimist(process.argv.slice(2));

if (argv.version || argv.v) {
  process.stdout.write(JSON.stringify({ version: "2.1.1", debug: true }) + '\n');
  process.exit(0);
}

// メイン処理
(async () => {
  try {
    const config = await getConfigFromApiKey();
    const supabase = createClient(config.url, config.key);

    console.error('[INFO] Connected to Supabase');
    console.error('[INFO] URL:', config.url);

    // MCPサーバー初期化
    const server = new Server({
      name: 'shared-supabase-mcp-minimal',
      version: '2.1.1-debug'
    }, {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {}
      }
    });

    server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query-my-data',
          description: 'Query XBRL financial data',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              filters: { type: 'object' },
              select: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['table']
          }
        },
        {
          name: 'get-storage-md',
          description: 'Get Markdown document from Supabase Storage (DEBUG)',
          inputSchema: {
            type: 'object',
            properties: {
              storage_path: { type: 'string' },
              max_bytes: { type: 'number' }
            },
            required: ['storage_path']
          }
        },
        {
          name: 'search-companies',
          description: 'Search companies',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['query']
          }
        },
        {
          name: 'test-storage-connection',
          description: 'Test storage connection and list buckets',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    // ツール実行ハンドラー
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      console.error(`[TOOL] Executing: ${toolName}`);
      console.error(`[ARGS]`, JSON.stringify(args, null, 2));

      try {
        switch (toolName) {
          case 'query-my-data': {
            const { table, filters = {}, select = '*', limit = 10 } = args;

            let query = supabase.from(table).select(select);

            if (filters && typeof filters === 'object') {
              for (const [key, value] of Object.entries(filters)) {
                if (value && typeof value === 'object') {
                  for (const [op, val] of Object.entries(value)) {
                    switch (op) {
                      case '$ilike':
                        query = query.ilike(key, val);
                        break;
                      case '$like':
                        query = query.like(key, val);
                        break;
                      default:
                        query = query.eq(key, val);
                    }
                  }
                } else {
                  query = query.eq(key, value);
                }
              }
            }

            query = query.limit(Math.min(limit, 100));
            const { data, error } = await query;

            if (error) {
              console.error('[QUERY ERROR]', error);
              throw new Error(`Query failed: ${error.message}`);
            }

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(data || [], null, 2)
              }]
            };
          }

          case 'get-storage-md': {
            const { storage_path, max_bytes = 500000 } = args;

            console.error('[STORAGE] Attempting to download:', storage_path);

            try {
              // バケットリストを取得
              const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
              console.error('[STORAGE] Available buckets:', buckets?.map(b => b.name));

              if (bucketsError) {
                console.error('[STORAGE] Buckets error:', bucketsError);
              }

              // ファイルのダウンロードを試みる
              const { data, error } = await supabase.storage
                .from('markdown-files')
                .download(storage_path);

              if (error) {
                console.error('[STORAGE ERROR] Full error object:', JSON.stringify(error, null, 2));
                console.error('[STORAGE ERROR] Message:', error.message);
                console.error('[STORAGE ERROR] Status:', error.status);
                console.error('[STORAGE ERROR] Status text:', error.statusText);

                // publicURLを試す
                const { data: urlData } = supabase.storage
                  .from('markdown-files')
                  .getPublicUrl(storage_path);

                console.error('[STORAGE] Public URL:', urlData?.publicUrl);

                return {
                  content: [{
                    type: 'text',
                    text: `Storage error: ${JSON.stringify(error)}\nTried path: ${storage_path}`
                  }]
                };
              }

              if (!data) {
                console.error('[STORAGE] No data returned');
                return {
                  content: [{
                    type: 'text',
                    text: `No data found at path: ${storage_path}`
                  }]
                };
              }

              console.error('[STORAGE] Success! Data size:', data.size);
              const text = await data.text();
              const truncated = text.slice(0, max_bytes);

              return {
                content: [{
                  type: 'text',
                  text: truncated
                }]
              };

            } catch (storageError) {
              console.error('[STORAGE EXCEPTION]', storageError);
              return {
                content: [{
                  type: 'text',
                  text: `Storage exception: ${storageError.message || storageError}`
                }]
              };
            }
          }

          case 'search-companies': {
            const { query: searchQuery, limit = 10 } = args;

            const { data, error } = await supabase
              .from('companies')
              .select('*')
              .or(`company_name.ilike.%${searchQuery}%,ticker_code.ilike.%${searchQuery}%`)
              .limit(Math.min(limit, 50));

            if (error) {
              console.error('[SEARCH ERROR]', error);
              throw new Error(`Search failed: ${error.message}`);
            }

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(data || [], null, 2)
              }]
            };
          }

          case 'test-storage-connection': {
            try {
              // バケット一覧を取得
              const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

              let result = 'Storage Connection Test:\n\n';

              if (bucketsError) {
                result += `Buckets Error: ${JSON.stringify(bucketsError)}\n`;
              } else {
                result += `Available Buckets: ${buckets?.map(b => b.name).join(', ')}\n\n`;
              }

              // markdown-filesバケットのファイルをリスト
              const { data: files, error: filesError } = await supabase.storage
                .from('markdown-files')
                .list('FY2020/S100KLVZ/PublicDoc_markdown', {
                  limit: 5
                });

              if (filesError) {
                result += `Files Error: ${JSON.stringify(filesError)}\n`;
              } else {
                result += `Sample Files in FY2020/S100KLVZ:\n`;
                files?.forEach(f => {
                  result += `  - ${f.name} (${f.metadata?.size || 0} bytes)\n`;
                });
              }

              return {
                content: [{
                  type: 'text',
                  text: result
                }]
              };
            } catch (err) {
              return {
                content: [{
                  type: 'text',
                  text: `Test failed: ${err.message}`
                }]
              };
            }
          }

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      } catch (error) {
        console.error(`[ERROR] Tool execution failed:`, error);
        throw error;
      }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[INFO] MCP Server started (DEBUG MODE)');

  } catch (error) {
    console.error('[FATAL ERROR]', error);
    process.exit(1);
  }
})();