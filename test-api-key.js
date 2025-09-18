// Test API key with xbrl-api-minimal
const apiKey = 'xbrl_live_2_KR6CCNFkyqNKTY3XgJ5KqD1HEahR6yZJlLaH';
const baseUrl = 'https://xbrl-api-minimal.vercel.app';

async function testApiKey() {
  console.log('Testing API key:', apiKey.substring(0, 20) + '...');

  try {
    // Test 1: Health check (no auth required)
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData.status);

    // Test 2: Companies endpoint with API key
    console.log('\n2. Testing companies endpoint with API key...');
    const companiesResponse = await fetch(`${baseUrl}/api/v1/companies?fiscal_year=FY2024&limit=2`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', companiesResponse.status);
    const companiesData = await companiesResponse.json();

    if (companiesResponse.ok) {
      console.log('Success! API key is valid.');
      console.log('Response:', JSON.stringify(companiesData, null, 2));
    } else {
      console.log('API key validation failed:', companiesData.error || companiesData.message);
    }

    // Test 3: Documents endpoint with API key
    console.log('\n3. Testing documents endpoint with API key...');
    const docsResponse = await fetch(`${baseUrl}/api/v1/documents?company_id=S100CLML&fiscal_year=FY2024&limit=2`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', docsResponse.status);
    const docsData = await docsResponse.json();

    if (docsResponse.ok) {
      console.log('Success! Documents retrieved.');
      console.log('Document count:', docsData.data?.length || 0);
    } else {
      console.log('Documents API failed:', docsData.error || docsData.message);
    }

  } catch (error) {
    console.error('Error during API test:', error);
  }
}

testApiKey();