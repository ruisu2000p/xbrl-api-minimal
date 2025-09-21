// 統一APIテストスクリプト
// api-proxyの新しいエンドポイントをテストします

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const API_KEY = process.env.TEST_API_KEY || 'xbrl_v1_4193e7523980d0464c1e9794b6c98535';

async function testEndpoint(name, endpoint, method = 'GET', body = null) {
  console.log(`\n=== Testing ${name} ===`);

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, options);
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Headers:');
    ['x-ratelimit-limit', 'x-ratelimit-remaining'].forEach(header => {
      const value = response.headers.get(header);
      if (value) console.log(`  ${header}: ${value}`);
    });

    // レスポンスの一部を表示
    if (data.companies) {
      console.log(`Found ${data.companies.length} companies`);
      if (data.companies.length > 0) {
        console.log('First company:', data.companies[0]);
      }
    } else if (data.data && Array.isArray(data.data)) {
      console.log(`Found ${data.data.length} records`);
      if (data.data.length > 0) {
        console.log('First record:', data.data[0]);
      }
    } else if (data.content) {
      console.log(`Content length: ${data.content.length} characters`);
      console.log('Content preview:', data.content.substring(0, 200) + '...');
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }

    return { success: response.status === 200, data };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('Starting Unified API Tests');
  console.log('Using API Key:', API_KEY);
  console.log('Supabase URL:', SUPABASE_URL);

  // 1. 企業検索（部分一致）
  await testEndpoint(
    'Search Companies - Partial Match',
    'api-proxy/search-companies',
    'POST',
    { query: 'エル', limit: 5 }
  );

  // 2. Markdownファイル取得
  await testEndpoint(
    'Get Markdown Files',
    'api-proxy/markdown-files'
  );

  // 3. SQLクエリ実行
  await testEndpoint(
    'Execute SQL Query',
    'api-proxy/query-data',
    'POST',
    {
      query: 'SELECT DISTINCT company_name FROM markdown_files_metadata WHERE company_name LIKE \'%株式会社%\' LIMIT 5'
    }
  );

  // 4. ファイル内容取得
  await testEndpoint(
    'Get File Content',
    'api-proxy/get-file-content',
    'POST',
    {
      fiscal_year: 'FY2024',
      company_id: 'S100T6VC',
      file_type: 'AuditDoc'
    }
  );

  console.log('\n=== Test Complete ===');
}

// メイン実行
runTests().catch(console.error);