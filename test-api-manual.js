// Manual test for companies API route via HTTP requests
const http = require('http');

async function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testApiRoute() {
  console.log('Testing companies API route via HTTP...');

  // Test 1: Missing API key
  console.log('\n1. Testing missing API key...');
  try {
    const result1 = await makeRequest('http://localhost:3000/api/v1/companies');
    console.log('Status:', result1.status);
    console.log('Data:', result1.data);

    if (result1.status === 401 && result1.data.error === 'API key required' && result1.data.code === 'MISSING_API_KEY') {
      console.log('✅ Test 1 PASSED');
    } else {
      console.log('❌ Test 1 FAILED');
    }
  } catch (error) {
    console.log('❌ Test 1 ERROR:', error.message.replace(/[\r\n\t]/g, ''));
  }

  // Test 2: Invalid API key format
  console.log('\n2. Testing invalid API key format...');
  try {
    const result2 = await makeRequest('http://localhost:3000/api/v1/companies', {
      'X-API-Key': 'invalid'
    });
    console.log('Status:', result2.status);
    console.log('Data:', result2.data);

    if (result2.status === 401 && result2.data.error === 'Invalid API key format' && result2.data.code === 'INVALID_API_KEY_FORMAT') {
      console.log('✅ Test 2 PASSED');
    } else {
      console.log('❌ Test 2 FAILED');
    }
  } catch (error) {
    console.log('❌ Test 2 ERROR:', error.message.replace(/[\r\n\t]/g, ''));
  }

  // Test 3: Invalid limit parameter
  console.log('\n3. Testing invalid limit parameter...');
  try {
    const result3 = await makeRequest('http://localhost:3000/api/v1/companies?limit=abc', {
      'X-API-Key': 'valid-test-api-key-12345'
    });
    console.log('Status:', result3.status);
    console.log('Data:', result3.data);

    if (result3.status === 400 && result3.data.error === 'Invalid limit parameter' && result3.data.code === 'INVALID_LIMIT') {
      console.log('✅ Test 3 PASSED');
    } else {
      console.log('❌ Test 3 FAILED');
    }
  } catch (error) {
    console.log('❌ Test 3 ERROR:', error.message.replace(/[\r\n\t]/g, ''));
  }

  console.log('\nManual testing completed.');
}

testApiRoute();