#!/usr/bin/env node

/**
 * Secure XBRL MCP Server
 * Vercelで発行されたAPIキーをSupabaseで検証
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const USER_API_KEY = process.env.XBRL_API_KEY || '';

// Supabase client (public)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API Key validation state
let apiKeyValid = false;
let apiKeyInfo = null;
let rateLimitRemaining = null;

/**
 * APIキーをSupabaseで検証
 */
async function validateApiKey(apiKey) {
  if (!apiKey) {
    console.error('[AUTH] No API key provided');
    return false;
  }

  try {
    // APIキーのハッシュ化（Vercelと同じ方式）
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Supabaseでキーを検証
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('*, profiles(*)')
      .eq('key_hash', hashedKey)
      .eq('is_active', true)
      .single();

    if (error || !keyData) {
      console.error('[AUTH] Invalid API key');
      return false;
    }

    // 有効期限チェック
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      console.error('[AUTH] API key expired');
      return false;
    }

    // レート制限チェック
    const { data: usage, error: usageError } = await supabase
      .from('api_usage')
      .select('request_count, last_reset')
      .eq('api_key_id', keyData.id)
      .single();

    if (usage) {
      const hoursSinceReset = (Date.now() - new Date(usage.last_reset).getTime()) / 3600000;
      if (hoursSinceReset < 1 && usage.request_count >= keyData.rate_limit_per_hour) {
        console.error('[AUTH] Rate limit exceeded');
        return false;
      }
      rateLimitRemaining = keyData.rate_limit_per_hour - usage.request_count;
    }

    // 使用状況を記録
    await supabase
      .from('api_usage')
      .upsert({
        api_key_id: keyData.id,
        request_count: (usage?.request_count || 0) + 1,
        last_reset: hoursSinceReset >= 1 ? new Date().toISOString() : usage?.last_reset,
        last_used: new Date().toISOString()
      });

    apiKeyInfo = {
      id: keyData.id,
      user_id: keyData.user_id,
      plan: keyData.profiles?.subscription_plan || 'free',
      rate_limit: keyData.rate_limit_per_hour,
      expires_at: keyData.expires_at
    };

    console.error(`[AUTH] API key validated - Plan: ${apiKeyInfo.plan}, Remaining: ${rateLimitRemaining}`);
    return true;

  } catch (error) {
    console.error('[AUTH] Validation error:', error.message);
    return false;
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'xbrl-secure-mcp',
    version: '4.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize authentication on startup
async function initializeAuth() {
  if (USER_API_KEY) {
    apiKeyValid = await validateApiKey(USER_API_KEY);
    if (!apiKeyValid) {
      console.error('[WARNING] Invalid API key - Limited functionality available');
    }
  } else {
    console.error('[WARNING] No API key provided - Public access only');
  }
}

// Tool definitions with access control
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const publicTools = [
    {
      name: 'search_companies',
      description: '企業を検索（公開機能）',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索キーワード' },
          limit: { type: 'number', description: '最大5件（無料版）', default: 5 }
        },
        required: ['query']
      }
    },
    {
      name: 'get_api_status',
      description: 'APIキーの状態を確認',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ];

  const premiumTools = [
    {
      name: 'get_company_details',
      description: '企業詳細情報（要APIキー）',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID' }
        },
        required: ['company_id']
      }
    },
    {
      name: 'get_financial_data',
      description: '財務データ取得（要APIキー）',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID' },
          fiscal_year: { type: 'string', description: '会計年度', default: '2021' }
        },
        required: ['company_id']
      }
    },
    {
      name: 'compare_companies',
      description: '企業比較（プレミアム機能）',
      inputSchema: {
        type: 'object',
        properties: {
          company_ids: { type: 'array', items: { type: 'string' } },
          metrics: { type: 'array', items: { type: 'string' } }
        },
        required: ['company_ids']
      }
    }
  ];

  // APIキーの有効性に応じてツールを返す
  const tools = apiKeyValid 
    ? [...publicTools, ...premiumTools]
    : publicTools;

  return { tools };
});

// Tool execution with access control
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_companies': {
        // 公開機能（制限付き）
        const limit = apiKeyValid ? (args.limit || 10) : Math.min(args.limit || 5, 5);
        
        const { data: companies, error } = await supabase
          .from('companies')
          .select('id, company_name, industry_category')
          .ilike('company_name', `%${args.query || ''}%`)
          .limit(limit);

        if (error) throw error;

        const resultText = apiKeyValid
          ? `🔍 検索結果（${companies?.length || 0}件）:\n\n${companies?.map(c => 
              `• ${c.company_name} (${c.id})\n  業種: ${c.industry_category || '不明'}`
            ).join('\n') || '該当なし'}`
          : `🔍 検索結果（無料版: 最大5件）:\n\n${companies?.slice(0, 5).map(c => 
              `• ${c.company_name} (${c.id})`
            ).join('\n') || '該当なし'}\n\n📌 全機能を利用するにはAPIキーが必要です`;

        return {
          content: [{
            type: 'text',
            text: resultText
          }]
        };
      }

      case 'get_api_status': {
        const statusText = apiKeyValid
          ? `✅ APIキー: 有効
プラン: ${apiKeyInfo?.plan || '不明'}
レート制限: ${rateLimitRemaining || '不明'}/${apiKeyInfo?.rate_limit || '不明'} リクエスト/時
有効期限: ${apiKeyInfo?.expires_at || '無期限'}`
          : `❌ APIキー: 未設定または無効

APIキーを取得するには:
1. https://xbrl-api-minimal.vercel.app にアクセス
2. アカウント作成/ログイン
3. ダッシュボードからAPIキー取得
4. 環境変数 XBRL_API_KEY に設定`;

        return {
          content: [{
            type: 'text',
            text: statusText
          }]
        };
      }

      case 'get_company_details': {
        if (!apiKeyValid) {
          return {
            content: [{
              type: 'text',
              text: '❌ この機能にはAPIキーが必要です。\n`get_api_status`で確認してください。'
            }]
          };
        }

        const { data: company, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', args.company_id)
          .single();

        if (error || !company) {
          return {
            content: [{
              type: 'text',
              text: `企業が見つかりませんでした: ${args.company_id}`
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: `📊 企業詳細情報

名称: ${company.company_name}
ID: ${company.id}
業種: ${company.industry_category || '不明'}
設立: ${company.established_date || '不明'}
従業員数: ${company.employee_count || '不明'}
資本金: ${company.capital || '不明'}`
          }]
        };
      }

      case 'get_financial_data': {
        if (!apiKeyValid) {
          return {
            content: [{
              type: 'text',
              text: '❌ この機能にはAPIキーが必要です。'
            }]
          };
        }

        // プランに応じたアクセス制限
        if (apiKeyInfo?.plan === 'free') {
          // 無料プランは最新1年のみ
          const currentYear = new Date().getFullYear();
          if (args.fiscal_year && parseInt(args.fiscal_year) < currentYear - 1) {
            return {
              content: [{
                type: 'text',
                text: '❌ 無料プランでは最新1年分のデータのみアクセス可能です。\n過去データにアクセスするには有料プランが必要です。'
              }]
            };
          }
        }

        // Storageから財務データ取得
        const { data: files } = await supabase.storage
          .from('markdown-files')
          .list(`${args.fiscal_year || '2021'}/${args.company_id}`);

        if (!files || files.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `財務データが見つかりませんでした: ${args.company_id}`
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: `📈 財務データ（${args.fiscal_year || '2021'}年度）
企業ID: ${args.company_id}

利用可能なドキュメント: ${files.length}件
- 損益計算書
- 貸借対照表
- キャッシュフロー計算書

詳細な分析にはプレミアムプランが必要です。`
          }]
        };
      }

      case 'compare_companies': {
        if (!apiKeyValid || apiKeyInfo?.plan === 'free') {
          return {
            content: [{
              type: 'text',
              text: '❌ 企業比較機能はプレミアムプラン以上で利用可能です。'
            }]
          };
        }

        // Premium feature implementation
        return {
          content: [{
            type: 'text',
            text: `📊 企業比較機能（プレミアム）\n比較対象: ${args.company_ids.join(', ')}`
          }]
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `不明なツール: ${name}`
          }]
        };
    }
  } catch (error) {
    console.error(`[ERROR] Tool execution failed: ${error.message}`);
    return {
      content: [{
        type: 'text',
        text: `エラーが発生しました: ${error.message}`
      }]
    };
  }
});

// Server startup
async function main() {
  console.error('Starting Secure XBRL MCP Server...');
  
  // Initialize authentication
  await initializeAuth();
  
  // Start MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Server ready - Secure mode enabled');
  console.error(`API Key: ${apiKeyValid ? '✅ Valid' : '❌ Invalid/Missing'}`);
  console.error(`Access Level: ${apiKeyValid ? (apiKeyInfo?.plan || 'unknown') : 'public'}`);
}

main().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});