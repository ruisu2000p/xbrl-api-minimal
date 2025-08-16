import fetch from 'node-fetch';

const API_URL = 'https://xbrl-api-minimal.vercel.app/api/v1/companies';
const API_KEY = 'xbrl_live_test_admin_key_2025';

async function testAPI() {
  console.log('🎯 API Test\n');
  console.log('=====================================\n');
  
  try {
    // Test API
    const response = await fetch(`${API_URL}?per_page=1`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    const data = await response.json();
    
    console.log('📊 Response:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n=====================================\n');
    
    // Check results
    if (data.total >= 4000) {
      console.log('✅ SUCCESS! API is returning data from 4,225 companies!');
    } else if (data.total > 10) {
      console.log('⚠️ Partial success - some data available');
    } else {
      console.log('❌ Still returning sample data (10 companies)');
    }
    
    console.log(`\nTotal companies: ${data.total || 0}`);
    console.log(`Data source: ${data.source || 'unknown'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run test
testAPI().then(() => {
  console.log('\n✅ Test completed');
}).catch(error => {
  console.error('❌ Error:', error);
});