// API エンドポイントテストスクリプト

const baseURL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🔍 API エンドポイントテスト開始\n');

  // 1. Health Check
  console.log('1️⃣  Health Check');
  try {
    const health = await fetch(`${baseURL}/api/health`);
    const healthData = await health.json();
    console.log('✅ Health:', healthData.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // 2. Config endpoint
  console.log('\n2️⃣  Config Endpoint');
  try {
    const config = await fetch(`${baseURL}/api/config`);
    const configData = await config.json();
    console.log('✅ Config available:', configData.anon_key ? 'Yes' : 'No');
  } catch (error) {
    console.log('❌ Config fetch failed:', error.message);
  }

  // 3. V1 Config (API Key required)
  console.log('\n3️⃣  V1 API Config');
  try {
    const v1Config = await fetch(`${baseURL}/api/v1/config`, {
      headers: {
        'X-API-Key': 'test-key'
      }
    });
    if (v1Config.status === 401) {
      console.log('⚠️  V1 Config: Authentication required (expected)');
    } else {
      const v1Data = await v1Config.json();
      console.log('✅ V1 Config:', v1Data);
    }
  } catch (error) {
    console.log('❌ V1 Config failed:', error.message);
  }

  // 4. Companies endpoint
  console.log('\n4️⃣  Companies Endpoint');
  try {
    const companies = await fetch(`${baseURL}/api/v1/companies?fiscal_year=FY2024`, {
      headers: {
        'X-API-Key': process.env.XBRL_API_KEY || 'test-key'
      }
    });

    if (companies.status === 401) {
      console.log('⚠️  Companies: Authentication required');
    } else if (companies.status === 200) {
      const companiesData = await companies.json();
      console.log(`✅ Companies found: ${companiesData.companies?.length || 0}`);
    }
  } catch (error) {
    console.log('❌ Companies fetch failed:', error.message);
  }

  // 5. Documents endpoint
  console.log('\n5️⃣  Documents Endpoint');
  try {
    const docs = await fetch(`${baseURL}/api/v1/documents?company_id=S100CLML&fiscal_year=FY2024`, {
      headers: {
        'X-API-Key': process.env.XBRL_API_KEY || 'test-key'
      }
    });

    if (docs.status === 401) {
      console.log('⚠️  Documents: Authentication required');
    } else if (docs.status === 200) {
      const docsData = await docs.json();
      console.log(`✅ Documents found: ${docsData.documents?.length || 0}`);
    }
  } catch (error) {
    console.log('❌ Documents fetch failed:', error.message);
  }

  console.log('\n✨ テスト完了');
}

// 実行
testEndpoints().catch(console.error);