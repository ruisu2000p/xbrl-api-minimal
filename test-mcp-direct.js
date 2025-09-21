#!/usr/bin/env node

// MCPサーバーの直接テスト
const { spawn } = require('child_process');

console.log('Testing MCP Server v3.12.0 with JWT authentication...\n');

// 環境変数を設定
const env = {
  ...process.env,
  SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
  XBRL_API_KEY: 'xbrl_v1_c1tq34z9bcoic0z8zvy6i5r2vdccpgnv'
};

// MCPサーバーを起動
const server = spawn('node', [
  'C:/Users/pumpk/xbrl-mcp-server/index.js'
], {
  env: env,
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // JSONレスポンスを探す
  const lines = responseBuffer.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.includes('jsonrpc')) {
      try {
        const response = JSON.parse(line);
        console.log('Response received:', JSON.stringify(response, null, 2));

        // 結果を解析
        if (response.result && response.result.content) {
          const content = JSON.parse(response.result.content[0].text);
          console.log('\n=== Result ===');
          console.log('Success:', content.success);
          console.log('Count:', content.count);
          if (content.companies) {
            console.log('\nCompanies found:');
            content.companies.slice(0, 5).forEach(company => {
              console.log(`  - ${company.company_name} (${company.company_id})`);
            });
          }
        }
      } catch (e) {
        // JSON解析エラーは無視
      }
    }
  }
});

server.stderr.on('data', (data) => {
  const message = data.toString();
  if (message.includes('running on stdio')) {
    console.log('✅ MCP Server started successfully\n');

    // 初期化リクエストを送信
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "0.1.0",
        capabilities: {}
      }
    };

    server.stdin.write(JSON.stringify(initRequest) + '\n');

    // 1秒後にツールリストを要求
    setTimeout(() => {
      console.log('Requesting tool list...');
      const listToolsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {}
      };
      server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    }, 1000);

    // 2秒後にトヨタを検索
    setTimeout(() => {
      console.log('\nSearching for Toyota...');
      const searchRequest = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "search_companies_by_name",
          arguments: {
            company_name: "トヨタ",
            limit: 10
          }
        }
      };
      server.stdin.write(JSON.stringify(searchRequest) + '\n');
    }, 2000);

    // 5秒後に終了
    setTimeout(() => {
      console.log('\nTest completed.');
      server.kill();
      process.exit(0);
    }, 5000);
  }
});

server.on('error', (error) => {
  console.error('Error starting MCP server:', error);
  process.exit(1);
});