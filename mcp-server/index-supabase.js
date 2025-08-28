#!/usr/bin/env node

/**
 * XBRL MCP Server - Supabase Direct Access
 * APIキーを使用してSupabaseから有価証券報告書データを取得
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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmekhpY2Z1aGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkzODU1MjAsImV4cCI6MjA0NDk2MTUyMH0.H1NkNDhlBzej5Rqfoc5Nc4L94T6RiKnntUqS4ybTxKo';
const API_KEY = process.env.XBRL_API_KEY || '';

// Use Service Role key if available (bypasses RLS)
const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
if (SUPABASE_SERVICE_KEY) {
  console.error('[CONFIG] Using Service Role key - Full access mode');
} else {
  console.error('[CONFIG] Using Anon key - Limited by RLS policies');
}

// Supabase client
const supabase = createClient(SUPABASE_URL, supabaseKey);

// API Key validation
let isAuthenticated = false;
let userPlan = 'free';
let apiKeyData = null;

/**
 * APIキーを検証（Vercel発行のキーをSupabaseで確認）
 */
async function validateApiKey(apiKey) {
  if (!apiKey) {
    console.error('[AUTH] No API key provided - Running without authentication');
    console.error('[AUTH] Some features may be limited');
    return false;
  }

  try {
    console.error(`[AUTH] Validating API key: ${apiKey.substring(0, 20)}...`);
    
    // まずprofilesテーブルで直接APIキーを検証
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (profileData && !profileError) {
      apiKeyData = profileData;
      userPlan = profileData.plan || profileData.subscription_plan || 'free';
      console.error(`[AUTH] ✓ Authenticated via profiles table - Plan: ${userPlan}`);
      return true;
    }

    // APIキーのハッシュ化を試す
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    console.error(`[AUTH] Trying hashed key: ${hashedKey.substring(0, 20)}...`);
    
    // api_keysテーブルを確認（存在する場合）
    const { data: apiKeyRecord, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*, profiles(*)')
      .eq('key_hash', hashedKey)
      .maybeSingle();

    if (apiKeyRecord && !apiKeyError) {
      apiKeyData = apiKeyRecord;
      userPlan = apiKeyRecord.profiles?.plan || apiKeyRecord.profiles?.subscription_plan || 'free';
      console.error(`[AUTH] ✓ Authenticated via api_keys table - Plan: ${userPlan}`);
      return true;
    }

    // 認証失敗でも継続（読み取り専用モード）
    console.error('[AUTH] ⚠️ API key not found in database');
    console.error('[AUTH] Continuing in read-only mode with limited features');
    console.error('[AUTH] Available tables will be checked...');
    
    // テーブル構造を確認（デバッグ用）
    const { data: tables } = await supabase
      .rpc('get_tables', {}, { count: 'exact' })
      .limit(1);
    
    if (tables) {
      console.error('[DEBUG] Database connection successful');
    }
    
    return false;
  } catch (error) {
    console.error('[AUTH] Warning:', error.message);
    console.error('[AUTH] Continuing without authentication - Basic features only');
    // エラーでもサーバーは起動させる
    return false;
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'xbrl-supabase-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: 'search_companies',
      description: '企業名や業種で企業を検索（Supabase companies テーブル）',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索キーワード' },
          limit: { type: 'number', description: '最大件数', default: 10 }
        },
        required: ['query']
      }
    },
    {
      name: 'get_company',
      description: '企業の詳細情報を取得',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID（例: S100LJ4F）' }
        },
        required: ['company_id']
      }
    },
    {
      name: 'list_documents',
      description: '企業の有価証券報告書一覧を取得（Storage）',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID' },
          year: { type: 'string', description: '年度（例: 2021, FY2021）' }
        },
        required: ['company_id']
      }
    },
    {
      name: 'read_document',
      description: '有価証券報告書の内容を読む（Markdown）',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID' },
          year: { type: 'string', description: '年度' },
          section: { type: 'string', description: 'セクション（例: 0101010）' }
        },
        required: ['company_id', 'year', 'section']
      }
    }
  ];

  // 認証済みの場合、追加機能を提供
  if (isAuthenticated && userPlan !== 'free') {
    tools.push({
      name: 'analyze_financial',
      description: '財務データの詳細分析（プレミアム機能）',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID' },
          year: { type: 'string', description: '年度' },
          metrics: { 
            type: 'array', 
            items: { type: 'string' },
            description: '分析指標',
            default: ['revenue', 'profit', 'roe']
          }
        },
        required: ['company_id', 'year']
      }
    });
  }

  return { tools };
});

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'search_companies': {
        console.error(`[SEARCH] Searching for: ${args.query}`);
        
        // companiesテーブルから検索
        const { data, error } = await supabase
          .from('companies')
          .select('id, company_name, ticker_symbol, industry_category, sector')
          .or(`company_name.ilike.%${args.query}%,industry_category.ilike.%${args.query}%,sector.ilike.%${args.query}%`)
          .limit(args.limit || 10);

        if (error) {
          console.error('[SEARCH] Error:', error.message);
          // エラーでも空配列を返して続行
          result = [];
        } else {
          result = data || [];
          console.error(`[SEARCH] Found ${result.length} companies`);
        }
        break;
      }

      case 'get_company': {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', args.company_id)
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case 'list_documents': {
        // Storage から企業のドキュメント一覧を取得
        const basePath = args.year && args.year.startsWith('FY') 
          ? `${args.year}/${args.company_id}`
          : `${args.company_id}`;

        const { data, error } = await supabase.storage
          .from('markdown-files')
          .list(basePath, {
            limit: 100,
            offset: 0
          });

        if (error) throw error;
        
        // PublicDoc_markdown内のファイルも確認
        const publicPath = `${basePath}/PublicDoc_markdown`;
        const { data: publicDocs } = await supabase.storage
          .from('markdown-files')
          .list(publicPath, {
            limit: 100,
            offset: 0
          });

        result = {
          main: data || [],
          public_docs: publicDocs || [],
          path: basePath
        };
        break;
      }

      case 'read_document': {
        // 有価証券報告書の内容を取得
        let filePath;
        
        // パスパターンを試す
        const patterns = [
          `${args.year}/${args.company_id}/PublicDoc_markdown/${args.section}_honbun_jpcrp030000-asr-001_${args.company_id.replace('S', 'E')}-000_2021-01-20_01_2021-04-15_ixbrl.md`,
          `${args.company_id}/PublicDoc_markdown/${args.section}_honbun_jpcrp030000-asr-001_${args.company_id.replace('S', 'E')}-000_2021-01-20_01_2021-04-15_ixbrl.md`,
          `FY${args.year}/${args.company_id}/PublicDoc/${args.section}.md`,
          `${args.year}/${args.company_id}/${args.section}.md`
        ];

        let content = null;
        let successPath = null;

        for (const pattern of patterns) {
          try {
            const { data, error } = await supabase.storage
              .from('markdown-files')
              .download(pattern);

            if (!error && data) {
              content = await data.text();
              successPath = pattern;
              break;
            }
          } catch (e) {
            // Try next pattern
          }
        }

        if (!content) {
          throw new Error(`Document not found. Tried paths: ${patterns.join(', ')}`);
        }

        result = {
          content: content,
          path: successPath,
          company_id: args.company_id,
          year: args.year,
          section: args.section
        };
        break;
      }

      case 'analyze_financial': {
        if (!isAuthenticated || userPlan === 'free') {
          throw new Error('This feature requires a premium subscription');
        }

        // 財務データを取得して分析
        const sections = ['0105010', '0105020', '0105030']; // 財務諸表セクション
        const documents = [];

        for (const section of sections) {
          try {
            const { data } = await supabase.storage
              .from('markdown-files')
              .download(`${args.company_id}/PublicDoc_markdown/${section}_honbun_jpcrp030000-asr-001_${args.company_id.replace('S', 'E')}-000_2021-01-20_01_2021-04-15_ixbrl.md`);
            
            if (data) {
              documents.push({
                section,
                content: await data.text()
              });
            }
          } catch (e) {
            // Skip missing sections
          }
        }

        // 簡易的な分析
        result = {
          company_id: args.company_id,
          year: args.year,
          documents_found: documents.length,
          metrics: args.metrics,
          analysis: 'Financial data retrieved successfully. Further analysis can be performed on the content.',
          documents: documents
        };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' 
            ? result 
            : JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error(`[ERROR] Tool execution failed: ${error.message}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: error.message,
            tool: name
          }, null, 2)
        }
      ]
    };
  }
});

// Main execution
async function main() {
  console.error('='.repeat(50));
  console.error('XBRL Supabase MCP Server');
  console.error('='.repeat(50));
  console.error(`Supabase URL: ${SUPABASE_URL}`);
  
  // APIキー検証
  if (API_KEY) {
    isAuthenticated = await validateApiKey(API_KEY);
  } else {
    console.error('[WARNING] No API key provided - Limited features available');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[INFO] Server is ready');
  console.error('[INFO] Connected to Supabase');
  console.error('='.repeat(50));
}

main().catch((error) => {
  console.error('[FATAL] Server failed:', error);
  process.exit(1);
});