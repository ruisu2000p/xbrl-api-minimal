// Test the newly created API key
const API_KEY = 'xbrl_v1_c1tq34z9bcoic0z8zvy6i5r2vdccpgnv';
const API_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/api-proxy';

async function testApiKey() {
  console.log('Testing API key:', API_KEY);

  try {
    // Test the markdown-files endpoint
    const response = await fetch(`${API_URL}/markdown-files?limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:');
    console.log('  X-RateLimit-Limit:', response.headers.get('X-RateLimit-Limit'));
    console.log('  X-RateLimit-Remaining:', response.headers.get('X-RateLimit-Remaining'));

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ API key is working!');
      console.log('Response data:');
      console.log('  Tier:', data.tier);
      console.log('  Number of files:', data.data ? data.data.length : 0);

      if (data.data && data.data.length > 0) {
        console.log('\nFirst file:');
        console.log('  Company:', data.data[0].company_name);
        console.log('  Fiscal Year:', data.data[0].fiscal_year);
        console.log('  File Type:', data.data[0].file_type);
      }

      // Check if Free tier restrictions are applied
      if (data.tier === 'free') {
        console.log('\n📊 Free tier restrictions are active');
        const fiscalYears = data.data ? [...new Set(data.data.map(f => f.fiscal_year))] : [];
        console.log('  Available fiscal years:', fiscalYears.join(', '));
      }
    } else {
      const error = await response.text();
      console.log('❌ API request failed:', error);
    }
  } catch (error) {
    console.error('❌ Error testing API key:', error);
  }
}

// Run the test
testApiKey();