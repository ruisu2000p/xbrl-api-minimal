#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// 設定
const VERCEL_API_URL = process.env.XBRL_API_URL || 'https://xbrl-api-minimal.vercel.app';
const API_KEY = process.env.XBRL_API_KEY || '';

// MCPサーバーインスタンスを作成
const server = new Server(
  {
    name: 'xbrl-financial-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// API呼び出しヘルパー
async function callAPI(endpoint, options = {}) {
  const url = `${VERCEL_API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// ツール一覧を提供
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_companies',
        description: '企業名やIDで企業を検索します',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '検索キーワード（企業名やID）',
            },
            limit: {
              type: 'number',
              description: '最大結果数（デフォルト: 10）',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_company_details',
        description: '企業の詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID（例: S100LJ4F）',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_financial_data',
        description: '企業の財務データを取得・分析します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            fiscal_year: {
              type: 'string',
              description: '会計年度（デフォルト: 2021）',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'compare_companies',
        description: '複数企業の財務データを比較します',
        inputSchema: {
          type: 'object',
          properties: {
            company_ids: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: '比較する企業IDのリスト',
            },
            metrics: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: '比較する指標（revenue, profit, roe等）',
              default: ['revenue', 'profit'],
            },
          },
          required: ['company_ids'],
        },
      },
    ],
  };
});

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'search_companies': {
        // 企業一覧を取得
        const response = await callAPI('/api/companies');
        let companies = response.data || response || [];
        
        // クエリでフィルタリング
        if (args.query) {
          const query = args.query.toLowerCase();
          companies = companies.filter(company => 
            company.company_name?.toLowerCase().includes(query) ||
            company.ticker_symbol?.toLowerCase().includes(query) ||
            company.id?.toLowerCase().includes(query)
          );
        }
        
        // 制限を適用
        const limit = args.limit || 10;
        companies = companies.slice(0, limit);
        
        // 結果を整形
        const resultText = companies.length > 0
          ? `${companies.length}件の企業が見つかりました:\n\n${companies.map(c => 
              `• ${c.company_name || '不明'} (ID: ${c.id})\n  業種: ${c.industry_category || '不明'}`
            ).join('\n\n')}`
          : '該当する企業が見つかりませんでした。';
        
        return {
          content: [
            {
              type: 'text',
              text: resultText,
            },
          ],
        };
      }
      
      case 'get_company_details': {
        // 企業詳細を取得
        const response = await callAPI(`/api/companies/${args.company_id}`);
        const company = response.data || response;
        
        if (!company) {
          return {
            content: [
              {
                type: 'text',
                text: `企業ID ${args.company_id} の情報が見つかりませんでした。`,
              },
            ],
          };
        }
        
        const detailText = `企業詳細情報:

名称: ${company.company_name || '不明'}
ID: ${company.id || args.company_id}
ティッカー: ${company.ticker_symbol || '未設定'}
業種: ${company.industry_category || '不明'}
セクター: ${company.sector || '不明'}
設立日: ${company.established_date || '不明'}
従業員数: ${company.employee_count || '不明'}
資本金: ${company.capital || '不明'}
決算期: ${company.fiscal_year_end || '不明'}
上場状況: ${company.listing_status || '不明'}
所在地: ${company.address || '不明'}`;
        
        return {
          content: [
            {
              type: 'text',
              text: detailText,
            },
          ],
        };
      }
      
      case 'get_financial_data': {
        // 財務データを取得・分析
        try {
          const response = await callAPI('/api/analyze', {
            method: 'POST',
            body: JSON.stringify({
              company_id: args.company_id,
              fiscal_year: args.fiscal_year || '2021',
              metrics: ['revenue', 'profit', 'roe', 'roa'],
            }),
          });
          
          const data = response.data || response;
          
          const financialText = `財務データ分析結果:

企業ID: ${args.company_id}
会計年度: ${args.fiscal_year || '2021'}

主要財務指標:
${data.metrics ? Object.entries(data.metrics).map(([key, value]) => 
  `• ${key}: ${value}`
).join('\n') : '財務データが利用できません'}

${data.summary ? `\n分析サマリー:\n${data.summary}` : ''}`;
          
          return {
            content: [
              {
                type: 'text',
                text: financialText,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `財務データの取得中にエラーが発生しました: ${error.message}`,
              },
            ],
          };
        }
      }
      
      case 'compare_companies': {
        // 複数企業の比較
        const results = [];
        
        for (const companyId of args.company_ids) {
          try {
            const response = await callAPI('/api/analyze', {
              method: 'POST',
              body: JSON.stringify({
                company_id: companyId,
                metrics: args.metrics || ['revenue', 'profit'],
              }),
            });
            
            const data = response.data || response;
            results.push({
              company_id: companyId,
              metrics: data.metrics || {},
            });
          } catch (error) {
            results.push({
              company_id: companyId,
              error: error.message,
            });
          }
        }
        
        const comparisonText = `企業比較結果:

比較企業数: ${args.company_ids.length}
比較指標: ${(args.metrics || ['revenue', 'profit']).join(', ')}

${results.map(item => {
  if (item.error) {
    return `${item.company_id}: エラー - ${item.error}`;
  }
  return `${item.company_id}:\n${Object.entries(item.metrics).map(([key, value]) => 
    `  • ${key}: ${value}`
  ).join('\n')}`;
}).join('\n\n')}`;
        
        return {
          content: [
            {
              type: 'text',
              text: comparisonText,
            },
          ],
        };
      }
      
      default:
        return {
          content: [
            {
              type: 'text',
              text: `エラー: 不明なツール「${name}」が呼び出されました。`,
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `エラーが発生しました: ${error.message}`,
        },
      ],
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('XBRL MCP Server started successfully');
  console.error(`API URL: ${VERCEL_API_URL}`);
  console.error(`API Key: ${API_KEY ? 'Set' : 'Not set'}`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});