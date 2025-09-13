#!/usr/bin/env node

// ===== セキュアバージョン 2.0.0 =====
// stdout はプロトコル専用。上書きしない！
console.log = (...args) => console.error('[LOG]', ...args);

// デバッグ：起動時にstderrにバージョン表示
console.error('[shared-supabase-mcp-minimal v2.0.0] Starting SECURE version with environment variables...');

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
import crypto from 'crypto';

// ===== セキュリティ監視 =====
class SecurityMonitor {
  constructor() {
    this.requestCounts = new Map();
    this.suspiciousPatterns = [];
    this.maxRequestsPerMinute = 100;
  }

  trackRequest(toolName, args) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${toolName}:${minute}`;

    const count = (this.requestCounts.get(key) || 0) + 1;
    this.requestCounts.set(key, count);

    // 古いエントリをクリーンアップ
    for (const [k, _] of this.requestCounts) {
      const [, m] = k.split(':');
      if (parseInt(m) < minute - 5) {
        this.requestCounts.delete(k);
      }
    }

    // レート制限チェック
    if (count > this.maxRequestsPerMinute) {
      console.error(`[SECURITY WARNING] Rate limit exceeded for ${toolName}: ${count} requests/min`);
      this.logSuspiciousActivity(toolName, args, 'RATE_LIMIT_EXCEEDED');
      return false;
    }

    // 疑わしいパターンのチェック
    if (this.detectSuspiciousPattern(args)) {
      console.error(`[SECURITY WARNING] Suspicious pattern detected in ${toolName}`);
      this.logSuspiciousActivity(toolName, args, 'SUSPICIOUS_PATTERN');
      return false;
    }

    return true;
  }

  detectSuspiciousPattern(args) {
    // 大量データ取得の試み
    if (args.limit && args.limit > 1000) return true;

    // SQLインジェクションの可能性
    if (args.filters && JSON.stringify(args.filters).match(/[';"].*DROP|DELETE|UPDATE|INSERT/i)) {
      return true;
    }

    // パストラバーサル攻撃
    if (args.storage_path && args.storage_path.includes('../')) return true;

    return false;
  }

  logSuspiciousActivity(toolName, args, reason) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      tool: toolName,
      reason: reason,
      args: JSON.stringify(args),
      hash: crypto.randomBytes(16).toString('hex')
    };

    this.suspiciousPatterns.push(logEntry);
    console.error('[SECURITY LOG]', JSON.stringify(logEntry));
  }
}

// ===== 環境変数による設定 =====
const getEnvConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  // フォールバック（開発環境用）
  const fallbackUrl = process.env.XBRL_SUPABASE_URL;
  const fallbackKey = process.env.XBRL_ANON_KEY;

  if (!url && !fallbackUrl) {
    console.error('[ERROR] Missing SUPABASE_URL environment variable');
    console.error('Please set either SUPABASE_URL or XBRL_SUPABASE_URL');
    console.error('');
    console.error('Example for Windows (Command Prompt):');
    console.error('  set SUPABASE_URL=https://your-project.supabase.co');
    console.error('  set SUPABASE_ANON_KEY=your-anon-key-here');
    console.error('');
    console.error('Example for Claude Desktop config:');
    console.error('  "env": {');
    console.error('    "SUPABASE_URL": "https://your-project.supabase.co",');
    console.error('    "SUPABASE_ANON_KEY": "your-anon-key-here"');
    console.error('  }');
    process.exit(1);
  }

  if (!key && !fallbackKey) {
    console.error('[ERROR] Missing SUPABASE_ANON_KEY environment variable');
    process.exit(1);
  }

  return {
    url: url || fallbackUrl,
    key: key || fallbackKey
  };
};

// CLIパラメータ解析
const argv = minimist(process.argv.slice(2));

// バージョン・ヘルスチェック（JSONのみ出力）
if (argv.version || argv.v) {
  process.stdout.write(JSON.stringify({ version: "2.0.0", secure: true }) + '\n');
  process.exit(0);
}
if (argv.healthcheck) {
  process.stdout.write(JSON.stringify({ ok: true, secure: true }) + '\n');
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
    // 環境変数から設定を取得
    const config = getEnvConfig();
    const supabase = createClient(config.url, config.key);

    // セキュリティ監視の初期化
    const securityMonitor = new SecurityMonitor();

    console.error('[INFO] Successfully connected to Supabase (SECURE MODE)');
    console.error(`[INFO] Project URL: ${config.url.replace(/https:\/\/([^.]+)\..*/, 'https://$1.supabase.co')}`);

    // MCPサーバー初期化
    const server = new Server({
      name: 'shared-supabase-mcp-minimal',
      version: '2.0.0'
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

    // ツール定義（セキュリティ強化版）
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query-my-data',
          description: 'Query XBRL financial data from markdown_files_metadata or companies table (SECURE)',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Table name (e.g. markdown_files_metadata, companies)',
                enum: ['markdown_files_metadata', 'companies'] // 許可されたテーブルのみ
              },
              filters: { type: 'object', description: 'Filter conditions. Use $ilike for partial match' },
              select: { type: 'string', description: 'Columns to select (default: *)' },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10, max: 100)',
                maximum: 100
              },
            },
            required: ['table'],
          },
        },
        {
          name: 'get-storage-md',
          description: 'Get Markdown document from Supabase Storage (SECURE)',
          inputSchema: {
            type: 'object',
            properties: {
              storage_path: {
                type: 'string',
                description: 'Path in markdown-files bucket (validated for security)'
              },
              max_bytes: {
                type: 'number',
                description: 'Maximum bytes to retrieve (default: 500000, max: 1000000)',
                maximum: 1000000
              },
            },
            required: ['storage_path'],
          },
        },
        {
          name: 'search-companies',
          description: 'Search companies by name or ticker code (SECURE)',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Company name or ticker code to search',
                minLength: 2,
                maxLength: 100
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10, max: 50)',
                maximum: 50
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get-security-status',
          description: 'Get current security monitoring status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        }
      ],
    }));

    // ツール実行（セキュリティチェック付き）
    server.setRequestHandler(CallToolRequestSchema, async (req) => {
      const { name, arguments: args } = req.params;

      // セキュリティチェック
      if (!securityMonitor.trackRequest(name, args)) {
        return {
          content: [{
            type: 'text',
            text: 'Request blocked by security monitor. Too many requests or suspicious pattern detected.'
          }],
        };
      }

      if (name === 'query-my-data') {
        // テーブル名の検証
        const allowedTables = ['markdown_files_metadata', 'companies'];
        if (!allowedTables.includes(args.table)) {
          return {
            content: [{ type: 'text', text: `Security Error: Table '${args.table}' is not allowed` }],
          };
        }

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

        const limit = Math.min(args.limit || 10, 100);
        query = query.limit(limit);

        const { data, error } = await query;

        if (error) {
          console.error('[DB ERROR]', error);
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
        // パストラバーサル攻撃の防止
        if (args.storage_path.includes('../') || args.storage_path.includes('..\\')) {
          return {
            content: [{ type: 'text', text: 'Security Error: Invalid path detected' }],
          };
        }

        const { data, error } = await supabase.storage
          .from('markdown-files')
          .download(args.storage_path);

        if (error) {
          console.error('[STORAGE ERROR]', error);
          return {
            content: [{ type: 'text', text: `Storage error: ${error.message}` }],
          };
        }

        const text = await data.text();
        const maxBytes = Math.min(args.max_bytes || 500000, 1000000);
        const truncated = text.length > maxBytes ? text.substring(0, maxBytes) + '\n...[truncated]' : text;

        return {
          content: [{ type: 'text', text: truncated }],
        };
      }

      if (name === 'search-companies') {
        // 入力の検証とサニタイゼーション
        const sanitizedQuery = args.query.replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
        const limit = Math.min(args.limit || 10, 50);

        let query = supabase
          .from('companies')
          .select('*')
          .limit(limit);

        // 企業名またはティッカーコードで検索
        query = query.or(`company_name.ilike.%${sanitizedQuery}%,ticker_code.ilike.%${sanitizedQuery}%`);

        const { data, error } = await query;

        if (error) {
          console.error('[SEARCH ERROR]', error);
          return {
            content: [{ type: 'text', text: `Search Error: ${error.message}` }],
          };
        }

        if (data.length === 0) {
          return {
            content: [{ type: 'text', text: `No companies found for query: "${sanitizedQuery}"` }],
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

      if (name === 'get-security-status') {
        const status = {
          version: '2.0.0',
          secure: true,
          monitoring: {
            totalRequests: Array.from(securityMonitor.requestCounts.values()).reduce((a, b) => a + b, 0),
            suspiciousActivities: securityMonitor.suspiciousPatterns.length,
            rateLimit: securityMonitor.maxRequestsPerMinute,
            lastSuspiciousActivity: securityMonitor.suspiciousPatterns.slice(-1)[0] || null
          }
        };

        return {
          content: [{
            type: 'text',
            text: `Security Status:\n${JSON.stringify(status, null, 2)}`
          }],
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