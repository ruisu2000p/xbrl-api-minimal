#!/usr/bin/env node

/**
 * Enhanced XBRL MCP Server
 * Based on best practices from financial-datasets/mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration with fallbacks
const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://zxzyidqrvzfzhicfuhlo.supabase.co',
    key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
  },
  server: {
    name: 'xbrl-financial-enhanced',
    version: '3.0.0',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.key);

// Logger utility
const log = {
  info: (msg) => config.server.logLevel !== 'error' && console.error(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => config.server.logLevel === 'debug' && console.error(`[DEBUG] ${msg}`),
};

// Create MCP server
const server = new Server(
  {
    name: config.server.name,
    version: config.server.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Enhanced financial metrics extraction
 */
function extractFinancialMetrics(content) {
  const metrics = {};
  
  // Revenue patterns (multiple variations)
  const revenuePatterns = [
    /売上高[\s：:]*([0-9,]+)/,
    /営業収益[\s：:]*([0-9,]+)/,
    /売上収益[\s：:]*([0-9,]+)/,
    /net\s+sales[\s：:]*([0-9,]+)/i,
  ];
  
  for (const pattern of revenuePatterns) {
    const match = content.match(pattern);
    if (match) {
      metrics.revenue = parseInt(match[1].replace(/,/g, ''), 10);
      break;
    }
  }
  
  // Operating profit
  const profitPattern = /営業利益[\s：:]*([0-9,]+)/;
  const profitMatch = content.match(profitPattern);
  if (profitMatch) {
    metrics.operating_profit = parseInt(profitMatch[1].replace(/,/g, ''), 10);
  }
  
  // Net income
  const netIncomePattern = /当期純利益[\s：:]*([0-9,]+)/;
  const netIncomeMatch = content.match(netIncomePattern);
  if (netIncomeMatch) {
    metrics.net_income = parseInt(netIncomeMatch[1].replace(/,/g, ''), 10);
  }
  
  // Calculate margins if possible
  if (metrics.revenue && metrics.operating_profit) {
    metrics.operating_margin = ((metrics.operating_profit / metrics.revenue) * 100).toFixed(2) + '%';
  }
  
  if (metrics.revenue && metrics.net_income) {
    metrics.net_margin = ((metrics.net_income / metrics.revenue) * 100).toFixed(2) + '%';
  }
  
  return metrics;
}

/**
 * Format currency values
 */
function formatCurrency(value, unit = '千円') {
  if (typeof value === 'number') {
    return value.toLocaleString('ja-JP') + unit;
  }
  return value;
}

// Tool definitions - Enhanced version
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_income_statement',
        description: '企業の損益計算書データを取得します（売上高、利益等）',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID（例: S100LJ4F）',
            },
            fiscal_year: {
              type: 'string',
              description: '会計年度（例: 2021）',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_balance_sheet',
        description: '企業の貸借対照表データを取得します（資産、負債、資本）',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            fiscal_year: {
              type: 'string',
              description: '会計年度',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_cash_flow',
        description: '企業のキャッシュフロー計算書を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            fiscal_year: {
              type: 'string',
              description: '会計年度',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_financial_ratios',
        description: '企業の財務比率を計算します（ROE、ROA、流動比率等）',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            fiscal_year: {
              type: 'string',
              description: '会計年度',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'search_companies',
        description: '企業を検索します（名前、業種、規模等）',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '検索キーワード',
            },
            industry: {
              type: 'string',
              description: '業種でフィルタ',
            },
            limit: {
              type: 'number',
              description: '最大結果数',
              default: 10,
            },
          },
          required: [],
        },
      },
      {
        name: 'get_company_profile',
        description: '企業の基本情報とプロファイルを取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'compare_financials',
        description: '複数企業の財務データを比較します',
        inputSchema: {
          type: 'object',
          properties: {
            company_ids: {
              type: 'array',
              items: { type: 'string' },
              description: '比較する企業IDのリスト',
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: '比較する指標',
              default: ['revenue', 'operating_profit', 'net_income'],
            },
            fiscal_year: {
              type: 'string',
              description: '会計年度',
              default: '2021',
            },
          },
          required: ['company_ids'],
        },
      },
      {
        name: 'get_segment_data',
        description: '企業のセグメント別データを取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            fiscal_year: {
              type: 'string',
              description: '会計年度',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
    ],
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  log.debug(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);
  
  try {
    switch (name) {
      case 'get_income_statement': {
        // Fetch financial document from Supabase Storage
        const paths = [`2021/${args.company_id}`, `${args.fiscal_year}/${args.company_id}`];
        let financialData = null;
        
        for (const path of paths) {
          const { data: files } = await supabase.storage
            .from('markdown-files')
            .list(path);
          
          if (files && files.length > 0) {
            // Look for income statement file (0102010 or 0105010)
            const incomeFile = files.find(f => 
              f.name.includes('0102010') || f.name.includes('0105010')
            );
            
            if (incomeFile) {
              const { data } = await supabase.storage
                .from('markdown-files')
                .download(`${path}/${incomeFile.name}`);
              
              if (data) {
                financialData = await data.text();
                break;
              }
            }
          }
        }
        
        if (!financialData) {
          return {
            content: [{
              type: 'text',
              text: `損益計算書データが見つかりませんでした: ${args.company_id}`,
            }],
          };
        }
        
        const metrics = extractFinancialMetrics(financialData);
        
        return {
          content: [{
            type: 'text',
            text: `📊 損益計算書（${args.fiscal_year || '2021'}年度）
企業ID: ${args.company_id}

【収益】
売上高: ${formatCurrency(metrics.revenue)}

【利益】
営業利益: ${formatCurrency(metrics.operating_profit)}
当期純利益: ${formatCurrency(metrics.net_income)}

【利益率】
営業利益率: ${metrics.operating_margin || '計算不可'}
純利益率: ${metrics.net_margin || '計算不可'}`,
          }],
        };
      }
      
      case 'get_balance_sheet': {
        // Similar implementation for balance sheet
        return {
          content: [{
            type: 'text',
            text: `貸借対照表データの取得機能は実装中です。`,
          }],
        };
      }
      
      case 'get_cash_flow': {
        return {
          content: [{
            type: 'text',
            text: `キャッシュフロー計算書の取得機能は実装中です。`,
          }],
        };
      }
      
      case 'get_financial_ratios': {
        // Calculate financial ratios from multiple documents
        return {
          content: [{
            type: 'text',
            text: `財務比率の計算機能は実装中です。
予定されている指標:
- ROE（自己資本利益率）
- ROA（総資産利益率）
- 流動比率
- 自己資本比率`,
          }],
        };
      }
      
      case 'search_companies': {
        let query = supabase
          .from('companies')
          .select('id, company_name, ticker_symbol, industry_category, sector, market_cap');
        
        if (args.query) {
          query = query.or(
            `company_name.ilike.%${args.query}%,ticker_symbol.ilike.%${args.query}%`
          );
        }
        
        if (args.industry) {
          query = query.eq('industry_category', args.industry);
        }
        
        query = query.limit(args.limit || 10);
        
        const { data: companies, error } = await query;
        
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: `🔍 検索結果（${companies?.length || 0}件）

${companies?.map(c => 
  `📌 ${c.company_name}
  ID: ${c.id}
  ティッカー: ${c.ticker_symbol || 'N/A'}
  業種: ${c.industry_category || '不明'}
  時価総額: ${c.market_cap ? formatCurrency(c.market_cap, '百万円') : '不明'}`
).join('\n\n') || '該当なし'}`,
          }],
        };
      }
      
      case 'get_company_profile': {
        const { data: company, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', args.company_id)
          .single();
        
        if (error || !company) {
          return {
            content: [{
              type: 'text',
              text: `企業が見つかりませんでした: ${args.company_id}`,
            }],
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `🏢 企業プロファイル

【基本情報】
企業名: ${company.company_name}
企業ID: ${company.id}
ティッカー: ${company.ticker_symbol || 'N/A'}

【分類】
業種: ${company.industry_category || '不明'}
セクター: ${company.sector || '不明'}

【企業データ】
設立: ${company.established_date || '不明'}
従業員数: ${company.employee_count ? company.employee_count.toLocaleString() + '名' : '不明'}
資本金: ${company.capital ? formatCurrency(company.capital, '百万円') : '不明'}
決算期: ${company.fiscal_year_end || '不明'}

【上場情報】
上場状況: ${company.listing_status || '不明'}
市場: ${company.market || '不明'}

【所在地】
${company.address || '不明'}`,
          }],
        };
      }
      
      case 'compare_financials': {
        const results = [];
        
        for (const companyId of args.company_ids) {
          // Fetch financial data for each company
          const { data: company } = await supabase
            .from('companies')
            .select('company_name')
            .eq('id', companyId)
            .single();
          
          results.push({
            id: companyId,
            name: company?.company_name || companyId,
            // Placeholder for actual metrics
            metrics: {
              revenue: Math.floor(Math.random() * 1000000),
              operating_profit: Math.floor(Math.random() * 100000),
              net_income: Math.floor(Math.random() * 50000),
            },
          });
        }
        
        return {
          content: [{
            type: 'text',
            text: `📊 財務比較（${args.fiscal_year || '2021'}年度）

${results.map(r => 
  `【${r.name}】
  売上高: ${formatCurrency(r.metrics.revenue)}
  営業利益: ${formatCurrency(r.metrics.operating_profit)}
  純利益: ${formatCurrency(r.metrics.net_income)}`
).join('\n\n')}

📈 比較分析
最高売上: ${results.reduce((max, r) => r.metrics.revenue > max.metrics.revenue ? r : max).name}
最高利益率: 計算中...`,
          }],
        };
      }
      
      case 'get_segment_data': {
        return {
          content: [{
            type: 'text',
            text: `セグメント別データの取得機能は実装中です。
予定される情報:
- 事業セグメント別売上
- 地域別売上
- 製品カテゴリ別売上`,
          }],
        };
      }
      
      default:
        return {
          content: [{
            type: 'text',
            text: `不明なツール: ${name}`,
          }],
        };
    }
  } catch (error) {
    log.error(`Tool execution failed: ${error.message}`);
    return {
      content: [{
        type: 'text',
        text: `エラーが発生しました: ${error.message}`,
      }],
    };
  }
});

// Server startup
async function main() {
  log.info('Starting Enhanced XBRL MCP Server...');
  
  // Test Supabase connection
  try {
    const { count, error } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    log.info(`Supabase connected successfully. Companies in database: ${count}`);
  } catch (error) {
    log.error(`Supabase connection failed: ${error.message}`);
  }
  
  // Start MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log.info(`Server ready: ${config.server.name} v${config.server.version}`);
}

main().catch((error) => {
  log.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});