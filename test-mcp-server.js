#!/usr/bin/env node

const { spawn } = require('child_process');

// MCPサーバーを起動してテスト
console.log('MCPサーバーのテストを開始します...\n');

// 環境変数を設定
const env = {
  ...process.env,
  SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
  XBRL_API_KEY: 'xbrl_live_pMfSHzBaH2cGKOzX1kHMpLd7X4gADRFOevIzlnMBHIq5' // テスト用のAPIキー
};

// MCPサーバーを起動
const mcp = spawn('npx', ['shared-supabase-mcp-minimal@latest'], {
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// タイムアウト設定
const timeout = setTimeout(() => {
  console.error('タイムアウト: MCPサーバーが応答しません');
  mcp.kill();
  process.exit(1);
}, 10000);

// ツール一覧を取得するテストリクエスト
const testRequest = {
  jsonrpc: '2.0',
  method: 'tools/list',
  params: {},
  id: 1
};

// 初期化リクエスト
const initRequest = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  },
  id: 0
};

let initialized = false;
let buffer = '';

mcp.stdout.on('data', (data) => {
  buffer += data.toString();

  // 改行で分割して処理
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('受信:', JSON.stringify(response, null, 2));

        if (response.id === 0 && response.result) {
          console.log('\n✅ MCPサーバーが正常に初期化されました');
          console.log('サーバー情報:', response.result.serverInfo);

          // ツール一覧を取得
          console.log('\nツール一覧を取得中...');
          mcp.stdin.write(JSON.stringify(testRequest) + '\n');
        } else if (response.id === 1 && response.result) {
          console.log('\n✅ 利用可能なツール:');
          response.result.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description?.substring(0, 50)}...`);
          });

          clearTimeout(timeout);
          console.log('\n✅ MCPサーバーのテストが完了しました！');
          mcp.kill();
          process.exit(0);
        }
      } catch (e) {
        // JSON以外の出力は無視
      }
    }
  }
});

mcp.stderr.on('data', (data) => {
  const msg = data.toString();
  if (!msg.includes('Debugger attached') && !msg.includes('Waiting for the debugger')) {
    console.error('エラー:', msg);
  }
});

mcp.on('close', (code) => {
  clearTimeout(timeout);
  if (code !== 0) {
    console.error(`MCPサーバーが異常終了しました (code ${code})`);
    process.exit(1);
  }
});

// 初期化リクエストを送信
console.log('初期化リクエストを送信...');
mcp.stdin.write(JSON.stringify(initRequest) + '\n');