#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fetch = require('node-fetch');

// 設定
const API_BASE = process.env.XBRL_API_URL || 'http://localhost:5001';

// サーバー作成
const server = new Server(
  {
    name: 'xbrl-financial-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール登録
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'list_files',
        description: '企業の有価証券報告書ファイル一覧を取得',
        inputSchema: {
          type: 'object',
          properties: {
            company: { type: 'string', description: '企業ID (例: S100LJ4F)' },
            year: { type: 'string', default: '2021' }
          },
          required: ['company']
        }
      },
      {
        name: 'get_content',
        description: '特定ファイルの内容を取得',
        inputSchema: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            index: { type: 'number', description: 'ファイル番号' },
            year: { type: 'string', default: '2021' }
          },
          required: ['company', 'index']
        }
      },
      {
        name: 'get_overview',
        description: '企業概況を取得',
        inputSchema: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            year: { type: 'string', default: '2021' }
          },
          required: ['company']
        }
      }
    ]
  };
});

// ツール実行
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let url, response, data;
    
    switch (name) {
      case 'list_files':
        url = `${API_BASE}/api/companies/${args.company}/files?year=${args.year || '2021'}`;
        response = await fetch(url);
        data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        const fileList = data.files.map((f, i) => 
          `${i}. ${f.section} (${Math.round(f.size/1024)}KB)`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `【${data.company_name || args.company}】\n年度: ${data.year}\nファイル数: ${data.total_files}\n\n${fileList}`
          }]
        };
        
      case 'get_content':
        url = `${API_BASE}/api/companies/${args.company}/files?year=${args.year || '2021'}&file=${args.index}`;
        response = await fetch(url);
        data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        let content = data.file.content;
        if (content.length > 8000) {
          content = content.substring(0, 8000) + '\n\n[...省略...]';
        }
        
        return {
          content: [{
            type: 'text',
            text: `【${data.file.name}】\n\n${content}`
          }]
        };
        
      case 'get_overview':
        // 企業概況（通常index=1）を取得
        url = `${API_BASE}/api/companies/${args.company}/files?year=${args.year || '2021'}&file=1`;
        response = await fetch(url);
        data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        let overview = data.file.content;
        if (overview.length > 5000) {
          overview = overview.substring(0, 5000) + '\n\n[...省略...]';
        }
        
        return {
          content: [{
            type: 'text',
            text: `【企業概況】\n企業ID: ${args.company}\n年度: ${args.year || '2021'}\n\n${overview}`
          }]
        };
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `エラー: ${error.message}`
      }],
      isError: true
    };
  }
});

// 起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('XBRL MCP Server started');
}

main().catch(console.error);