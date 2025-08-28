#!/usr/bin/env node

/**
 * XBRL MCP Server - API Version
 * Vercel APIを経由してXBRLデータにアクセス
 * Supabaseへの直接接続は行わない
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Configuration
const XBRL_API_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app';
const USER_API_KEY = process.env.XBRL_API_KEY || '';

// API validation state
let apiKeyValid = false;
let apiKeyInfo = null;

/**
 * APIキーをVercel API経由で検証
 */
async function validateApiKey(apiKey) {
  if (!apiKey) {
    console.error('[AUTH] No API key provided');
    return false;
  }

  try {
    const response = await fetch(`${XBRL_API_URL}/api/validate`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (!response.ok) {
      console.error('[AUTH] Invalid API key');
      return false;
    }

    const data = await response.json();
    apiKeyInfo = {
      plan: data.plan || 'free',
      rate_limit: data.rate_limit,
      remaining: data.remaining
    };

    console.error(`[AUTH] API key validated - Plan: ${apiKeyInfo.plan}`);
    return true;

  } catch (error) {
    console.error('[AUTH] Validation error:', error.message);
    return false;
  }
}

/**
 * Vercel API経由でリクエスト
 */
async function callVercelAPI(endpoint, params = {}) {
  const url = new URL(`${XBRL_API_URL}/api/${endpoint}`);
  
  if (params && Object.keys(params).length > 0) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (USER_API_KEY) {
    headers['X-API-Key'] = USER_API_KEY;
  }

  const response = await fetch(url.toString(), { headers });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Create MCP server
const server = new Server(
  {
    name: 'xbrl-api-mcp',
    version: '1.0.0',
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

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: 'search_companies',
      description: '企業名や業種で企業を検索します',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索キーワード（企業名または業種）' },
          limit: { type: 'number', description: '最大取得件数', default: 10 }
        },
        required: ['query']
      }
    },
    {
      name: 'get_company_details',
      description: '企業の詳細情報を取得します',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID（例: S100LJ4F）' }
        },
        required: ['company_id']
      }
    },
    {
      name: 'get_financial_documents',
      description: '企業の財務書類一覧を取得します',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID' },
          year: { type: 'string', description: '年度（例: 2021）' }
        },
        required: ['company_id']
      }
    },
    {
      name: 'read_financial_document',
      description: '特定の財務書類の内容を取得します',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID' },
          year: { type: 'string', description: '年度' },
          document_type: { type: 'string', description: '書類タイプ（例: 0101010）' }
        },
        required: ['company_id', 'year', 'document_type']
      }
    }
  ];

  if (apiKeyValid) {
    tools.push({
      name: 'analyze_financial_data',
      description: '財務データを分析します（認証必要）',
      inputSchema: {
        type: 'object',
        properties: {
          company_id: { type: 'string', description: '企業ID' },
          year: { type: 'string', description: '年度' },
          analysis_type: { 
            type: 'string', 
            description: '分析タイプ（profitability, growth, efficiency）',
            enum: ['profitability', 'growth', 'efficiency']
          }
        },
        required: ['company_id', 'year']
      }
    });

    tools.push({
      name: 'compare_companies',
      description: '複数企業の財務データを比較します（認証必要）',
      inputSchema: {
        type: 'object',
        properties: {
          company_ids: { 
            type: 'array', 
            items: { type: 'string' },
            description: '比較する企業IDのリスト'
          },
          year: { type: 'string', description: '年度' },
          metrics: {
            type: 'array',
            items: { type: 'string' },
            description: '比較する指標（revenue, profit, roe等）'
          }
        },
        required: ['company_ids', 'year']
      }
    });
  }

  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_companies': {
        const data = await callVercelAPI('companies', {
          search: args.query,
          limit: args.limit || 10
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case 'get_company_details': {
        const data = await callVercelAPI(`companies/${args.company_id}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case 'get_financial_documents': {
        const data = await callVercelAPI('documents', {
          company_id: args.company_id,
          year: args.year
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case 'read_financial_document': {
        const data = await callVercelAPI('documents/content', {
          company_id: args.company_id,
          year: args.year,
          document_type: args.document_type
        });
        return {
          content: [
            {
              type: 'text',
              text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case 'analyze_financial_data': {
        if (!apiKeyValid) {
          throw new Error('This feature requires API authentication');
        }
        const data = await callVercelAPI('financial/analyze', {
          company_id: args.company_id,
          year: args.year,
          analysis_type: args.analysis_type || 'profitability'
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case 'compare_companies': {
        if (!apiKeyValid) {
          throw new Error('This feature requires API authentication');
        }
        const data = await callVercelAPI('financial/compare', {
          company_ids: args.company_ids.join(','),
          year: args.year,
          metrics: args.metrics ? args.metrics.join(',') : 'revenue,profit,roe'
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`[ERROR] Tool execution failed: ${error.message}`);
    return {
      content: [
        {
          type: 'text',
          text: `エラーが発生しました: ${error.message}`
        }
      ]
    };
  }
});

// Main execution
async function main() {
  await initializeAuth();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[INFO] XBRL API MCP Server started successfully');
  console.error(`[INFO] API endpoint: ${XBRL_API_URL}`);
  console.error(`[INFO] Authentication: ${apiKeyValid ? 'Valid' : 'Not authenticated'}`);
}

main().catch((error) => {
  console.error('[FATAL] Server failed to start:', error);
  process.exit(1);
});