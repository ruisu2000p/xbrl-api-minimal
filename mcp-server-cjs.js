#!/usr/bin/env node

/**
 * XBRL Financial Data MCP Server (CommonJS版)
 * Claude Desktop用のMCPサーバー実装
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fetch = require('node-fetch');

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
server.setRequestHandler('tools/list', async () => {
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
        name: 'get_financial_overview',
        description: '企業の財務概要（企業の概況）を取得します',
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
    ],
  };
});

// ツール実行ハンドラ
server.setRequestHandler('tools/call', async (request) => {
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

      case 'get_financial_overview': {
        // 企業の概況ファイル（通常はindex 1）を取得
        const response = await fetch(
          `${API_BASE_URL}/api/companies/${args.company_id}/files?year=${args.year || '2021'}&file=1`
        );
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch financial overview');
        }
        
        // コンテンツを整形
        const content = data.file.content;
        const preview = content.substring(0, 5000);
        
        return {
          content: [
            {
              type: 'text',
              text: `企業ID: ${args.company_id}\n年度: ${args.year || '2021'}\n\n【企業の概況】\n\n${preview}\n\n[...続きがあります...]`,
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
  console.error('XBRL MCP Server (CJS) started successfully');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});