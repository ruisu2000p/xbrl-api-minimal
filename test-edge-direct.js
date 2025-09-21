// Test Edge Function directly
const fetch = require('node-fetch');

const API_KEY = 'xbrl_v1_3498974e5a029c0a0f47e9c18847a417';
const BASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/api-proxy';

async function testEdgeFunction() {
  console.log('Testing Edge Function api-proxy with English search...\n');

  // Test search-companies with English query
  console.log('Test 1: Search for "Toyota" (English)');
  try {
    const response = await fetch(`${BASE_URL}/search-companies`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Toyota',
        limit: 5
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test search-companies with Japanese query
  console.log('Test 2: Search for "ソニー" (Japanese)');
  try {
    const response = await fetch(`${BASE_URL}/search-companies`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'ソニー',
        limit: 5
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEdgeFunction();