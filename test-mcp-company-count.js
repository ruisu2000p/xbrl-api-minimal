// Test MCP endpoint to count total companies
const fetch = require('node-fetch');

const API_KEY = 'xbrl_v1_e7e6dfb0619a5e6accfcd9d8ac31c45d';
const BASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/api-proxy';

async function countCompanies() {
  console.log('Counting total companies via MCP API...\n');

  try {
    // List all companies with a high limit
    console.log('Listing all companies with high limit...');
    const listResponse = await fetch(`${BASE_URL}/search-companies`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '%',  // Wildcard to match all
        limit: 10000
      })
    });

    console.log(`Status: ${listResponse.status} ${listResponse.statusText}`);
    const listData = await listResponse.json();

    if (listData.companies) {
      // Count unique company IDs
      const uniqueCompanyIds = new Set(listData.companies.map(c => c.company_id));
      console.log(`Total unique companies returned: ${uniqueCompanyIds.size}`);
      console.log(`Total records: ${listData.companies.length}`);
    } else {
      console.log('Response:', JSON.stringify(listData, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

countCompanies();