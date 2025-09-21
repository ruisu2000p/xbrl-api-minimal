// APIキー統合テストスクリプト
// api-proxyで生成したキーが他のEdge Functionsで使えるか確認

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const TEST_API_KEY = process.env.TEST_API_KEY || 'xbrl_v1_test'; // 実際のAPIキーに置き換える

async function testEndpoint(name, endpoint, method = 'GET', body = null) {
  console.log(`\n=== Testing ${name} ===`);

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_API_KEY
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, options);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Headers:');
    ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-plan'].forEach(header => {
      const value = response.headers.get(header);
      if (value) console.log(`  ${header}: ${value}`);
    });
    console.log('Response:', JSON.stringify(data, null, 2));

    return { success: response.status === 200, data };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('Starting API Key Integration Tests');
  console.log('Using API Key:', TEST_API_KEY);
  console.log('Supabase URL:', SUPABASE_URL);

  // 1. Test api-proxy (markdown-files endpoint)
  await testEndpoint(
    'API Proxy - Markdown Files',
    'api-proxy/markdown-files'
  );

  // 2. Test search-companies
  await testEndpoint(
    'Search Companies',
    'search-companies',
    'POST',
    { query: 'トヨタ', limit: 5 }
  );

  // 3. Test query-my-data
  await testEndpoint(
    'Query My Data',
    'query-my-data',
    'POST',
    {
      query: 'SELECT company_name, fiscal_year FROM markdown_files_metadata LIMIT 5'
    }
  );

  // 4. Test get-storage-md
  await testEndpoint(
    'Get Storage MD',
    'get-storage-md',
    'POST',
    {
      fiscal_year: 'FY2024',
      company_id: 'S100CLML',
      file_type: 'AuditDoc'
    }
  );

  console.log('\n=== Test Complete ===');
}

// メイン実行
if (!TEST_API_KEY || TEST_API_KEY === 'xbrl_v1_test') {
  console.error('Please set TEST_API_KEY environment variable with a valid API key');
  console.log('Usage: SET TEST_API_KEY=xbrl_v1_... && node test-api-key-integration.js');
  process.exit(1);
}

runTests().catch(console.error);