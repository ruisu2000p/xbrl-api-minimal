#!/usr/bin/env node

import { createWriteStream } from 'fs';
import { spawn } from 'child_process';

// MCPサーバーのテスト関数
function testMCPServer() {
  console.log('🚀 XBRL Financial MCP Server テスト開始\n');

  // MCPサーバーを起動
  const server = spawn('node', ['xbrl-financial-mcp.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  // テストリクエスト1: ツール一覧取得
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  // テストリクエスト2: 企業検索
  const searchCompaniesRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'search_companies',
      arguments: {
        per_page: 3
      }
    }
  };

  let testResults = [];
  let testCount = 0;
  const totalTests = 2;

  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📤 Server Output:', output);
    
    try {
      const response = JSON.parse(output);
      testResults.push(response);
      testCount++;

      if (testCount === totalTests) {
        analyzeResults();
        server.kill();
      }
    } catch (e) {
      // JSON パースエラーは無視（ログメッセージの可能性）
    }
  });

  server.stderr.on('data', (data) => {
    console.log('🔧 Server Info:', data.toString());
  });

  server.on('close', (code) => {
    console.log(`\n✅ MCPサーバーテスト完了 (終了コード: ${code})\n`);
  });

  // テスト実行
  setTimeout(() => {
    console.log('📋 Test 1: ツール一覧取得');
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }, 1000);

  setTimeout(() => {
    console.log('📋 Test 2: 企業検索');
    server.stdin.write(JSON.stringify(searchCompaniesRequest) + '\n');
  }, 2000);

  // テスト結果分析
  function analyzeResults() {
    console.log('\n📊 テスト結果分析:');
    console.log('=' .repeat(50));
    
    testResults.forEach((result, index) => {
      console.log(`\nTest ${index + 1} 結果:`);
      console.log(`- ID: ${result.id}`);
      console.log(`- 成功: ${!result.error ? '✅' : '❌'}`);
      
      if (result.error) {
        console.log(`- エラー: ${result.error.message}`);
      } else if (result.result) {
        if (result.result.tools) {
          console.log(`- ツール数: ${result.result.tools.length}`);
          console.log(`- ツール: ${result.result.tools.map(t => t.name).join(', ')}`);
        } else if (result.result.content) {
          console.log(`- コンテンツタイプ: ${result.result.content[0]?.type}`);
          console.log(`- 結果プレビュー: ${result.result.content[0]?.text?.substring(0, 100)}...`);
        }
      }
    });
    
    const successCount = testResults.filter(r => !r.error).length;
    console.log(`\n📈 成功率: ${successCount}/${totalTests} (${(successCount/totalTests*100).toFixed(1)}%)`);
  }

  // タイムアウト処理
  setTimeout(() => {
    if (testCount < totalTests) {
      console.log('\n⏰ タイムアウト: テストを強制終了します');
      server.kill();
    }
  }, 10000);
}

// 代替テスト: APIエンドポイント直接テスト
async function testAPIEndpoints() {
  console.log('\n🌐 API エンドポイント直接テスト開始\n');
  
  const testCases = [
    {
      name: '企業一覧取得',
      url: 'https://xbrl-api-minimal.vercel.app/api/v1/companies-test?per_page=5',
      expectedFields: ['data', 'pagination', 'status']
    },
    {
      name: 'ドキュメント一覧取得',
      url: 'https://xbrl-api-minimal.vercel.app/api/v1/documents?per_page=3',
      expectedFields: ['success', 'data', 'pagination']
    }
  ];

  for (const test of testCases) {
    try {
      console.log(`📋 テスト: ${test.name}`);
      
      const response = await fetch(test.url);
      const data = await response.json();
      
      const hasAllFields = test.expectedFields.every(field => data.hasOwnProperty(field));
      const dataCount = Array.isArray(data.data) ? data.data.length : 0;
      
      console.log(`- ステータス: ${response.status === 200 ? '✅' : '❌'} (${response.status})`);
      console.log(`- 必須フィールド: ${hasAllFields ? '✅' : '❌'}`);
      console.log(`- データ件数: ${dataCount}`);
      
      if (dataCount > 0) {
        const firstItem = data.data[0];
        console.log(`- サンプルデータ: ${firstItem.company_name || firstItem.id || 'N/A'}`);
      }
      
    } catch (error) {
      console.log(`- エラー: ❌ ${error.message}`);
    }
    
    console.log();
  }
}

// メイン実行
async function main() {
  console.log('🧪 XBRL Financial MCP システム テストスイート');
  console.log('=' .repeat(60));
  
  // API直接テスト
  await testAPIEndpoints();
  
  // MCPサーバーテスト（Node.js環境でのみ実行）
  if (process.argv.includes('--mcp')) {
    testMCPServer();
  } else {
    console.log('💡 MCPサーバーテストを実行するには --mcp フラグを追加してください');
    console.log('💡 例: node test-mcp.js --mcp');
  }
}

main().catch(console.error);