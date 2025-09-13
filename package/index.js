#!/usr/bin/env node

// ===== stdout はプロトコル専用。上書きしない！ =====
// 人間向けログは stdout に出さないために console.log を抑止
console.log = (...args) => console.error('[LOG]', ...args);

// デバッグ：起動時にstderrにバージョン表示
console.error('[shared-supabase-mcp-minimal v1.9.1] Starting with XBRL Financial Tools...');

// エラーはすべてstderrへ
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// ===== ここからimport開始 =====
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

// ハードコード済みの認証情報（環境変数不要）
const SUPABASE_URL = "https://wpwqxhyiglbtlaimrjrx.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU";

// 環境変数は完全に無視（ハードコード優先）
if (!SUPABASE_URL || !ANON_KEY) {
  // これは起こらないはずだが、念のため
  console.error('[ERROR] Hardcoded config missing. This should not happen.');
  process.exit(1);
}

// CLIパラメータ解析
const argv = minimist(process.argv.slice(2));

// バージョン・ヘルスチェック（JSONのみ出力）
if (argv.version || argv.v) {
  process.stdout.write(JSON.stringify({ version: "1.9.1" }) + '\n');
  process.exit(0);
}
if (argv.healthcheck) {
  process.stdout.write(JSON.stringify({ ok: true }) + '\n');
  process.exit(0);
}

// 日本語数値変換関数
function parseJapaneseNumber(text) {
  if (!text) return null;
  
  const normalized = text
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/,/g, '')
    .replace(/，/g, '');
  
  const unitMultipliers = {
    '千円': 1000,
    '百万円': 1000000,
    '十億円': 1000000000,
    '億円': 100000000,
    '万円': 10000,
    '円': 1
  };
  
  for (const [unit, multiplier] of Object.entries(unitMultipliers)) {
    if (normalized.includes(unit)) {
      const numberPart = normalized.replace(unit, '').trim();
      const number = parseFloat(numberPart);
      if (!isNaN(number)) {
        return number * multiplier;
      }
    }
  }
  
  const number = parseFloat(normalized);
  return isNaN(number) ? null : number;
}

// 財務指標抽出関数（簡易版）
function extractBasicFinancialMetrics(content) {
  const metrics = {};
  
  const patterns = {
    revenue: [/売上高[\s\S]*?([0-9,]+)[\s]*?百万円/g],
    operating_profit: [/営業利益[\s\S]*?([0-9,]+)[\s]*?百万円/g],
    net_income: [/当期純利益[\s\S]*?([0-9,]+)[\s]*?百万円/g],
    total_assets: [/総資産[\s\S]*?([0-9,]+)[\s]*?百万円/g]
  };
  
  for (const [key, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        const value = parseJapaneseNumber(matches[0][1]);
        if (value !== null) {
          metrics[key] = value;
          break;
        }
      }
    }
  }
  
  return metrics;
}

// メイン処理
(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, ANON_KEY);
    
    // MCPサーバー初期化
    const server = new Server({
      name: 'shared-supabase-mcp-minimal',
      version: '1.9.1'
    }, {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {}
      }
    });
    
    // ハンドラー登録
    server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));
    
    // ツール定義（拡張版）
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query-my-data',
          description: 'Query XBRL financial data from markdown_files_metadata or companies table',
          inputSchema: {
            type: 'object',
            properties: {
              table: { type: 'string', description: 'Table name (e.g. markdown_files_metadata, companies)' },
              filters: { type: 'object', description: 'Filter conditions. Use $ilike for partial match (e.g. {"company_name": {"$ilike": "%システム%"}})' },
              select: { type: 'string', description: 'Columns to select (default: *)' },
              limit: { type: 'number', description: 'Maximum number of results (default: 10)' },
            },
            required: ['table'],
          },
        },
        {
          name: 'get-storage-md',
          description: 'Get Markdown document from Supabase Storage',
          inputSchema: {
            type: 'object',
            properties: {
              storage_path: { type: 'string', description: 'Path in markdown-files bucket (e.g. FY2024/S100KLVZ/PublicDoc/file.md)' },
              max_bytes: { type: 'number', description: 'Maximum bytes to retrieve (default: 500000)' },
            },
            required: ['storage_path'],
          },
        },
        {
          name: 'search-companies',
          description: 'Search companies by name or ticker code',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Company name or ticker code to search' },
              limit: { type: 'number', description: 'Maximum number of results (default: 10)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'extract-financial-metrics',
          description: 'Extract basic financial metrics from markdown content',
          inputSchema: {
            type: 'object',
            properties: {
              company_id: { type: 'string', description: 'Company ID' },
              storage_path: { type: 'string', description: 'Path to markdown file' },
            },
            required: ['company_id', 'storage_path'],
          },
        },
        {
          name: 'get-company-overview',
          description: 'Get comprehensive company overview including documents and basic metrics',
          inputSchema: {
            type: 'object',
            properties: {
              company_id: { type: 'string', description: 'Company ID (e.g. S100KLVZ)' },
              include_metrics: { type: 'boolean', description: 'Include financial metrics extraction' },
            },
            required: ['company_id'],
          },
        }
      ],
    }));
    
    // ツール実行
    server.setRequestHandler(CallToolRequestSchema, async (req) => {
      const { name, arguments: args } = req.params;
      
      if (name === 'query-my-data') {
        let query = supabase.from(args.table).select(args.select || '*');
        
        if (args.filters) {
          for (const [col, val] of Object.entries(args.filters)) {
            if (typeof val === 'object' && val.$ilike) {
              query = query.ilike(col, val.$ilike);
            } else {
              query = query.eq(col, val);
            }
          }
        }
        
        const limit = args.limit || 10;
        query = query.limit(limit);
        
        const { data, error } = await query;
        
        if (error) {
          return {
            content: [{ type: 'text', text: `Database Error: ${error.message}` }],
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: `Found ${data.length} records:\n\n${JSON.stringify(data, null, 2)}` 
          }],
        };
      }
      
      if (name === 'get-storage-md') {
        const { data, error } = await supabase.storage
          .from('markdown-files')
          .download(args.storage_path);
        
        if (error) {
          return {
            content: [{ type: 'text', text: `Storage error: ${error.message}` }],
          };
        }
        
        const text = await data.text();
        const maxBytes = args.max_bytes || 500000;
        const truncated = text.length > maxBytes ? text.substring(0, maxBytes) + '\n...[truncated]' : text;
        
        return {
          content: [{ type: 'text', text: truncated }],
        };
      }
      
      if (name === 'search-companies') {
        const limit = args.limit || 10;
        let query = supabase
          .from('companies')
          .select('*')
          .limit(limit);
        
        // 企業名またはティッカーコードで検索
        query = query.or(`company_name.ilike.%${args.query}%,ticker_code.ilike.%${args.query}%`);
        
        const { data, error } = await query;
        
        if (error) {
          return {
            content: [{ type: 'text', text: `Search Error: ${error.message}` }],
          };
        }
        
        if (data.length === 0) {
          return {
            content: [{ type: 'text', text: `No companies found for query: "${args.query}"` }],
          };
        }
        
        const results = data.map(company => 
          `【${company.company_name}】\n` +
          `- 企業ID: ${company.id}\n` +
          `- ティッカー: ${company.ticker_code || 'N/A'}\n` +
          `- 業界: ${company.sector || 'N/A'}\n`
        ).join('\n');
        
        return {
          content: [{ 
            type: 'text', 
            text: `企業検索結果 (${data.length}件):\n\n${results}` 
          }],
        };
      }
      
      if (name === 'extract-financial-metrics') {
        // ストレージからファイルを取得
        const { data: fileData, error: storageError } = await supabase.storage
          .from('markdown-files')
          .download(args.storage_path);
        
        if (storageError) {
          return {
            content: [{ type: 'text', text: `Storage error: ${storageError.message}` }],
          };
        }
        
        const content = await fileData.text();
        const metrics = extractBasicFinancialMetrics(content);
        
        let result = `【${args.company_id}】財務指標抽出結果:\n\n`;
        
        if (Object.keys(metrics).length === 0) {
          result += '財務指標を抽出できませんでした。';
        } else {
          if (metrics.revenue) result += `売上高: ${(metrics.revenue / 100000000).toFixed(1)}億円\n`;
          if (metrics.operating_profit) result += `営業利益: ${(metrics.operating_profit / 100000000).toFixed(1)}億円\n`;
          if (metrics.net_income) result += `当期純利益: ${(metrics.net_income / 100000000).toFixed(1)}億円\n`;
          if (metrics.total_assets) result += `総資産: ${(metrics.total_assets / 100000000).toFixed(1)}億円\n`;
        }
        
        return {
          content: [{ type: 'text', text: result }],
        };
      }
      
      if (name === 'get-company-overview') {
        // 企業基本情報を取得
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', args.company_id)
          .single();
        
        if (companyError) {
          return {
            content: [{ type: 'text', text: `Company not found: ${companyError.message}` }],
          };
        }
        
        // ドキュメント一覧を取得
        const { data: documents, error: docsError } = await supabase
          .from('markdown_files_metadata')
          .select('*')
          .eq('company_id', args.company_id)
          .limit(10);
        
        let result = `【${company.company_name}】企業概要\n\n`;
        result += `企業ID: ${company.id}\n`;
        result += `ティッカー: ${company.ticker_code || 'N/A'}\n`;
        result += `業界: ${company.sector || 'N/A'}\n\n`;
        
        if (docsError || !documents || documents.length === 0) {
          result += 'ドキュメントが見つかりませんでした。\n';
        } else {
          result += `📄 関連ドキュメント (${documents.length}件):\n`;
          documents.forEach(doc => {
            result += `- ${doc.file_name} (${doc.fiscal_year}年度)\n`;
          });
          
          // 財務指標抽出（オプション）
          if (args.include_metrics && documents.length > 0) {
            result += '\n📊 財務指標 (最新ドキュメントから抽出):\n';
            try {
              const latestDoc = documents[0];
              const { data: fileData } = await supabase.storage
                .from('markdown-files')
                .download(latestDoc.storage_path);
              
              if (fileData) {
                const content = await fileData.text();
                const metrics = extractBasicFinancialMetrics(content);
                
                if (Object.keys(metrics).length > 0) {
                  if (metrics.revenue) result += `売上高: ${(metrics.revenue / 100000000).toFixed(1)}億円\n`;
                  if (metrics.operating_profit) result += `営業利益: ${(metrics.operating_profit / 100000000).toFixed(1)}億円\n`;
                  if (metrics.net_income) result += `当期純利益: ${(metrics.net_income / 100000000).toFixed(1)}億円\n`;
                } else {
                  result += '財務指標の抽出に失敗しました。\n';
                }
              }
            } catch (metricsError) {
              result += `財務指標抽出エラー: ${metricsError.message}\n`;
            }
          }
        }
        
        return {
          content: [{ type: 'text', text: result }],
        };
      }
      
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      };
    });
    
    // Transport接続
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
  } catch (err) {
    console.error("Fatal:", err?.message || err);
    process.exit(1);
  }
})();