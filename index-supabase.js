#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

// Supabase設定
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Supabaseクライアント作成（Service Keyを優先使用）
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
);

// MCPサーバーインスタンスを作成
const server = new Server(
  {
    name: 'xbrl-supabase-direct',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 財務指標の抽出ヘルパー
function extractFinancialMetrics(content) {
  const metrics = {};
  
  // 売上高
  const revenuePattern = /売上高[：:]\s*([\d,]+)/;
  const revenueMatch = content.match(revenuePattern);
  if (revenueMatch) {
    metrics.revenue = revenueMatch[1].replace(/,/g, '');
  }
  
  // 営業利益
  const profitPattern = /営業利益[：:]\s*([\d,]+)/;
  const profitMatch = content.match(profitPattern);
  if (profitMatch) {
    metrics.operatingProfit = profitMatch[1].replace(/,/g, '');
  }
  
  // 当期純利益
  const netIncomePattern = /当期純利益[：:]\s*([\d,]+)/;
  const netIncomeMatch = content.match(netIncomePattern);
  if (netIncomeMatch) {
    metrics.netIncome = netIncomeMatch[1].replace(/,/g, '');
  }
  
  return metrics;
}

// ツール一覧を提供
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_companies',
        description: 'Supabaseの企業データベースから企業を検索します',
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
        description: '企業の詳細情報をSupabaseから取得します',
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
        name: 'get_financial_documents',
        description: 'Supabase Storageから財務ドキュメント一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID',
            },
            fiscal_year: {
              type: 'string',
              description: '会計年度（例: 2021, FY2021）',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'read_financial_document',
        description: 'Supabase Storageから特定の財務ドキュメントを読み込みます',
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
            document_name: {
              type: 'string',
              description: 'ドキュメント名（例: 0105010_honbun）',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'analyze_financial_data',
        description: 'Supabaseから財務データを取得して分析します',
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

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'search_companies': {
        // Supabaseのcompaniesテーブルから検索
        let queryBuilder = supabase
          .from('companies')
          .select('id, company_name, ticker_symbol, industry_category, sector');
        
        // 検索条件を追加
        if (args.query) {
          queryBuilder = queryBuilder.or(
            `company_name.ilike.%${args.query}%,ticker_symbol.ilike.%${args.query}%,id.ilike.%${args.query}%`
          );
        }
        
        // 制限を適用
        queryBuilder = queryBuilder.limit(args.limit || 10);
        
        const { data: companies, error } = await queryBuilder;
        
        if (error) {
          throw new Error(`Supabase検索エラー: ${error.message}`);
        }
        
        const resultText = companies && companies.length > 0
          ? `${companies.length}件の企業が見つかりました:\n\n${companies.map(c => 
              `• ${c.company_name} (ID: ${c.id})\n  業種: ${c.industry_category || '不明'}\n  セクター: ${c.sector || '不明'}`
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
        // Supabaseから企業詳細を取得
        const { data: company, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', args.company_id)
          .single();
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `企業情報の取得エラー: ${error.message}`,
              },
            ],
          };
        }
        
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
        
        const detailText = `企業詳細情報（Supabaseから取得）:

名称: ${company.company_name}
ID: ${company.id}
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
      
      case 'get_financial_documents': {
        // Supabase Storageからファイル一覧を取得
        const paths = [
          `${args.fiscal_year}/${args.company_id}`,
          `FY${args.fiscal_year}/${args.company_id}`,
          `fiscal-${args.fiscal_year}/${args.company_id}`,
        ];
        
        let files = [];
        let foundPath = null;
        
        for (const path of paths) {
          const { data, error } = await supabase.storage
            .from('markdown-files')
            .list(path, {
              limit: 100,
              offset: 0,
            });
          
          if (data && data.length > 0) {
            files = data;
            foundPath = path;
            break;
          }
        }
        
        if (files.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `企業ID ${args.company_id} の${args.fiscal_year || '2021'}年度のドキュメントが見つかりませんでした。`,
              },
            ],
          };
        }
        
        const documentList = files
          .filter(f => f.name && !f.name.startsWith('.'))
          .map(f => {
            const size = f.metadata?.size 
              ? `(${(f.metadata.size / 1024).toFixed(1)} KB)` 
              : '';
            return `• ${f.name} ${size}`;
          })
          .join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `財務ドキュメント一覧（${foundPath}）:\n\n${documentList}\n\n合計: ${files.length}ファイル`,
            },
          ],
        };
      }
      
      case 'read_financial_document': {
        // Supabase Storageから特定のファイルを読み込み
        const paths = [
          `${args.fiscal_year}/${args.company_id}`,
          `FY${args.fiscal_year}/${args.company_id}`,
          `fiscal-${args.fiscal_year}/${args.company_id}`,
          `2021/${args.company_id}`, // デフォルトパス
        ];
        
        let fileContent = null;
        let fileName = args.document_name || '0105010_honbun';
        
        // 拡張子を追加
        if (!fileName.endsWith('.md')) {
          // ファイル名パターンを試す
          const patterns = [
            `${fileName}_jpcrp030000-asr-001_*.md`,
            `${fileName}*.md`,
            `*${fileName}*.md`,
          ];
          
          // まずファイル一覧を取得
          for (const path of paths) {
            const { data: files } = await supabase.storage
              .from('markdown-files')
              .list(path);
            
            if (files && files.length > 0) {
              // パターンにマッチするファイルを探す
              const matchedFile = files.find(f => 
                f.name.includes(fileName) && f.name.endsWith('.md')
              );
              
              if (matchedFile) {
                fileName = matchedFile.name;
                
                // ファイルをダウンロード
                const { data, error } = await supabase.storage
                  .from('markdown-files')
                  .download(`${path}/${fileName}`);
                
                if (data && !error) {
                  fileContent = await data.text();
                  break;
                }
              }
            }
          }
        }
        
        if (!fileContent) {
          return {
            content: [
              {
                type: 'text',
                text: `ドキュメントが見つかりませんでした: ${args.company_id}/${fileName}`,
              },
            ],
          };
        }
        
        // 内容の最初の1000文字を表示
        const preview = fileContent.substring(0, 1000);
        
        return {
          content: [
            {
              type: 'text',
              text: `ドキュメント内容（${fileName}）:\n\n${preview}\n\n... (全${fileContent.length}文字)`,
            },
          ],
        };
      }
      
      case 'analyze_financial_data': {
        // 財務データファイルを読み込んで分析
        const fiscalYear = args.fiscal_year || '2021';
        const paths = [
          `${fiscalYear}/${args.company_id}`,
          `2021/${args.company_id}`,
        ];
        
        let financialData = null;
        
        for (const path of paths) {
          // 財務ファイル（0105010）を探す
          const { data: files } = await supabase.storage
            .from('markdown-files')
            .list(path);
          
          if (files && files.length > 0) {
            const financialFile = files.find(f => 
              f.name.includes('0105010') || f.name.includes('0102010')
            );
            
            if (financialFile) {
              const { data, error } = await supabase.storage
                .from('markdown-files')
                .download(`${path}/${financialFile.name}`);
              
              if (data && !error) {
                financialData = await data.text();
                break;
              }
            }
          }
        }
        
        if (!financialData) {
          return {
            content: [
              {
                type: 'text',
                text: `企業ID ${args.company_id} の財務データが見つかりませんでした。`,
              },
            ],
          };
        }
        
        // 財務指標を抽出
        const metrics = extractFinancialMetrics(financialData);
        
        const analysisText = `財務データ分析結果（Supabase Storageから直接取得）:

企業ID: ${args.company_id}
会計年度: ${fiscalYear}

抽出された財務指標:
${Object.entries(metrics).length > 0 
  ? Object.entries(metrics).map(([key, value]) => 
      `• ${key}: ${value}`
    ).join('\n')
  : '財務指標の抽出に失敗しました。'}

データソース: Supabase Storage (markdown-files バケット)
URL: ${SUPABASE_URL}`;
        
        return {
          content: [
            {
              type: 'text',
              text: analysisText,
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
  console.error('XBRL Supabase Direct MCP Server started');
  console.error(`Supabase URL: ${SUPABASE_URL}`);
  console.error(`Supabase Key: ${(SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY) ? 'Set' : 'Not set'}`);
  
  // 接続テスト
  const { data, error } = await supabase
    .from('companies')
    .select('count')
    .limit(1);
  
  if (error) {
    console.error('Supabase接続エラー:', error.message);
  } else {
    console.error('Supabase接続成功！');
  }
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});