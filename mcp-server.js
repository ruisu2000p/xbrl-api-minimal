#!/usr/bin/env node

/**
 * XBRL Financial Data MCP Server
 * Claude Desktop用のMCPサーバー実装
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// APIサーバーの設定
const API_BASE_URL = process.env.XBRL_API_URL || 'http://localhost:5001';

// MCPサーバーの作成
const server = new Server(
  {
    name: 'xbrl-financial-data',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_company_files',
        description: '指定企業の有価証券報告書ファイル一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID（例: S100LJ4F）',
            },
            year: {
              type: 'string',
              description: '年度（デフォルト: 2021）',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_file_content',
        description: '指定企業の特定セクションの内容を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID（例: S100LJ4F）',
            },
            file_index: {
              type: 'number',
              description: 'ファイルインデックス（0から開始）',
            },
            year: {
              type: 'string',
              description: '年度（デフォルト: 2021）',
              default: '2021',
            },
          },
          required: ['company_id', 'file_index'],
        },
      },
      {
        name: 'search_companies',
        description: '企業を検索します（名前または証券コード）',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '検索クエリ（企業名または証券コード）',
            },
            limit: {
              type: 'number',
              description: '取得件数の上限',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_financial_overview',
        description: '企業の財務概要（主要な経営指標）を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: '企業ID（例: S100LJ4F）',
            },
            year: {
              type: 'string',
              description: '年度（デフォルト: 2021）',
              default: '2021',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'compare_companies',
        description: '複数企業の特定セクションを比較します',
        inputSchema: {
          type: 'object',
          properties: {
            company_ids: {
              type: 'array',
              items: { type: 'string' },
              description: '比較する企業IDのリスト',
            },
            section: {
              type: 'string',
              description: '比較するセクション（例: 企業の概況、事業の状況）',
            },
            year: {
              type: 'string',
              description: '年度（デフォルト: 2021）',
              default: '2021',
            },
          },
          required: ['company_ids', 'section'],
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
      case 'get_company_files': {
        const response = await fetch(
          `${API_BASE_URL}/api/companies/${args.company_id}/files?year=${args.year || '2021'}`
        );
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch company files');
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `企業: ${data.company_name || data.company_id}\n年度: ${data.year}\nファイル数: ${data.total_files}\n\n` +
                data.files.map((f, i) => `${i}. ${f.section} (${f.name}, ${Math.round(f.size/1024)}KB)`).join('\n'),
            },
          ],
        };
      }

      case 'get_file_content': {
        const response = await fetch(
          `${API_BASE_URL}/api/companies/${args.company_id}/files?year=${args.year || '2021'}&file=${args.file_index}`
        );
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch file content');
        }
        
        // コンテンツを適切な長さに制限
        let content = data.file.content;
        if (content.length > 10000) {
          content = content.substring(0, 10000) + '\n\n[...内容が長いため省略されました...]';
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `ファイル: ${data.file.name}\nサイズ: ${Math.round(data.file.size/1024)}KB\n\n${content}`,
            },
          ],
        };
      }

      case 'search_companies': {
        // 現在のAPIには検索機能がないため、ダミーデータを返す
        // 将来的にはAPIを拡張して実装
        const sampleCompanies = [
          { id: 'S100LJ4F', name: '亀田製菓株式会社' },
          { id: 'S100LJ65', name: '豊田通商株式会社' },
          { id: 'S100LJ64', name: 'エステー株式会社' },
          { id: 'S100LJ5C', name: 'セキ株式会社' },
        ];
        
        const filtered = sampleCompanies.filter(c => 
          c.name.includes(args.query) || c.id.includes(args.query.toUpperCase())
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `検索結果（"${args.query}"）:\n\n` +
                filtered.map(c => `- ${c.id}: ${c.name}`).join('\n'),
            },
          ],
        };
      }

      case 'get_financial_overview': {
        // 企業の概況ファイル（通常はindex 1）を取得
        const response = await fetch(
          `${API_BASE_URL}/api/companies/${args.company_id}/files?year=${args.year || '2021'}&file=1`
        );
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch financial overview');
        }
        
        // 主要な経営指標を抽出（簡易版）
        const content = data.file.content;
        const lines = content.split('\n').slice(0, 100); // 最初の100行から抽出
        
        return {
          content: [
            {
              type: 'text',
              text: `企業ID: ${args.company_id}\n年度: ${args.year || '2021'}\n\n主要な経営指標（概要）:\n${lines.join('\n')}`,
            },
          ],
        };
      }

      case 'compare_companies': {
        const results = [];
        
        for (const companyId of args.company_ids) {
          try {
            // まずファイル一覧を取得
            const listResponse = await fetch(
              `${API_BASE_URL}/api/companies/${companyId}/files?year=${args.year || '2021'}`
            );
            const listData = await listResponse.json();
            
            // 指定セクションのファイルを探す
            const targetFile = listData.files.find(f => f.section === args.section);
            
            if (targetFile) {
              // ファイル内容を取得
              const contentResponse = await fetch(
                `${API_BASE_URL}/api/companies/${companyId}/files?year=${args.year || '2021'}&file=${targetFile.index}`
              );
              const contentData = await contentResponse.json();
              
              results.push({
                company_id: companyId,
                company_name: listData.company_name || companyId,
                content: contentData.file.content.substring(0, 2000), // 最初の2000文字
              });
            }
          } catch (error) {
            results.push({
              company_id: companyId,
              error: error.message,
            });
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `セクション比較: ${args.section}\n年度: ${args.year || '2021'}\n\n` +
                results.map(r => {
                  if (r.error) {
                    return `【${r.company_id}】\nエラー: ${r.error}`;
                  }
                  return `【${r.company_name || r.company_id}】\n${r.content}\n`;
                }).join('\n---\n\n'),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `エラーが発生しました: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('XBRL MCP Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});