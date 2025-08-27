/**
 * API Client Tests
 * APIクライアントのテスト
 */

import { APIClient } from '../lib/api-client.js';
import assert from 'assert';

// テスト用のモックフェッチ
global.fetch = async (url, options) => {
  const endpoint = url.toString();
  
  // モックレスポンス
  const mockResponses = {
    '/api/v1/validate': {
      valid: true,
      plan: 'pro',
      rate_limit: 1000,
      remaining: 999
    },
    '/api/v1/companies': {
      companies: [
        { id: 'S100LJ4F', name: '亀田製菓', industry: '食品' }
      ]
    }
  };

  // エンドポイントに応じてレスポンスを返す
  for (const [pattern, response] of Object.entries(mockResponses)) {
    if (endpoint.includes(pattern)) {
      return {
        ok: true,
        status: 200,
        json: async () => response
      };
    }
  }

  // 404エラー
  return {
    ok: false,
    status: 404,
    json: async () => ({ message: 'Not found' }),
    text: async () => 'Not found'
  };
};

async function runTests() {
  console.log('🧪 Starting API Client Tests...\n');
  
  const client = new APIClient();
  let passed = 0;
  let failed = 0;

  // Test 1: APIキー検証
  try {
    console.log('Test 1: API Key Validation');
    const result = await client.validateApiKey();
    assert(result.valid === true, 'API key should be valid');
    assert(result.plan === 'pro', 'Plan should be pro');
    console.log('✅ Passed\n');
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
    failed++;
  }

  // Test 2: 企業検索
  try {
    console.log('Test 2: Company Search');
    const result = await client.searchCompanies('亀田', 10);
    assert(Array.isArray(result.companies), 'Should return companies array');
    assert(result.companies.length > 0, 'Should have at least one company');
    assert(result.companies[0].name === '亀田製菓', 'Should find 亀田製菓');
    console.log('✅ Passed\n');
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
    failed++;
  }

  // Test 3: エラーハンドリング
  try {
    console.log('Test 3: Error Handling');
    await client.getCompanyDetails('INVALID');
    console.log('❌ Failed: Should have thrown error\n');
    failed++;
  } catch (error) {
    assert(error.message.includes('Not found'), 'Error message should contain "Not found"');
    console.log('✅ Passed\n');
    passed++;
  }

  // Test 4: リトライ機能
  try {
    console.log('Test 4: Retry Logic');
    let retryCount = 0;
    
    // リトライをシミュレート
    const originalFetch = global.fetch;
    global.fetch = async () => {
      retryCount++;
      if (retryCount < 2) {
        throw new Error('fetch failed');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      };
    };
    
    const result = await client.get('test');
    assert(retryCount === 2, 'Should retry once');
    assert(result.success === true, 'Should eventually succeed');
    
    global.fetch = originalFetch;
    console.log('✅ Passed\n');
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
    failed++;
  }

  // 結果サマリー
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// テスト実行
runTests().catch(console.error);