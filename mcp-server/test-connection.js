#!/usr/bin/env node

/**
 * API Connection Test
 * Vercel APIへの接続をテスト
 */

const API_URL = 'https://xbrl-api-minimal.vercel.app';

async function testEndpoint(path) {
  console.log(`Testing: ${path}`);
  try {
    const response = await fetch(`${API_URL}${path}`);
    console.log(`  Status: ${response.status}`);
    const contentType = response.headers.get('content-type');
    console.log(`  Content-Type: ${contentType}`);
    
    if (response.ok && contentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`  ✅ Success - Data keys:`, Object.keys(data).slice(0, 5));
    } else {
      console.log(`  ❌ Failed`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  console.log('');
}

async function main() {
  console.log('='.repeat(50));
  console.log('API Connection Test');
  console.log('='.repeat(50));
  console.log('');

  // Test various endpoint patterns
  await testEndpoint('/');
  await testEndpoint('/api');
  await testEndpoint('/api/companies');
  await testEndpoint('/api/v1/companies');
  await testEndpoint('/api/company');
  await testEndpoint('/api/search');
  await testEndpoint('/api/health');
  await testEndpoint('/api/status');
  
  console.log('='.repeat(50));
  console.log('Test complete');
}

main().catch(console.error);