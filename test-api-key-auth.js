// APIキー xbrl_v1_3498974e5a029c0a0f47e9c18847a417 の動作確認
const fetch = require('node-fetch');

const API_KEY = 'xbrl_v1_3498974e5a029c0a0f47e9c18847a417';
const API_BASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/api-proxy';

async function testApiEndpoints() {
  console.log('Testing API key:', API_KEY);
  console.log('=====================================\n');

  // Test 1: /config エンドポイント（公開）
  console.log('Test 1: /config endpoint (public)');
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    });
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('\n');

  // Test 2: /markdown-files エンドポイント（認証必要）
  console.log('Test 2: /markdown-files endpoint (auth required)');
  try {
    const response = await fetch(`${API_BASE_URL}/markdown-files?limit=1`, {
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('\n');

  // Test 3: 異なるヘッダー形式を試す
  console.log('Test 3: Different header formats');

  // Authorization: Bearer 形式
  console.log('  a) Authorization: Bearer format');
  try {
    const response = await fetch(`${API_BASE_URL}/markdown-files?limit=1`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log('  Error:', error.message);
  }

  // x-api-key 小文字
  console.log('  b) x-api-key (lowercase)');
  try {
    const response = await fetch(`${API_BASE_URL}/markdown-files?limit=1`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log('  Error:', error.message);
  }

  // apikey ヘッダー
  console.log('  c) apikey header');
  try {
    const response = await fetch(`${API_BASE_URL}/markdown-files?limit=1`, {
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log('  Error:', error.message);
  }
}

testApiEndpoints();