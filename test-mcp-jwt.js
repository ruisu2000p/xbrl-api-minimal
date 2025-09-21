#!/usr/bin/env node

// JWT認証を含むテスト
const https = require('https');

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const XBRL_API_KEY = 'xbrl_v1_c1tq34z9bcoic0z8zvy6i5r2vdccpgnv';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/functions/v1/api-proxy${path}`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'X-Api-Key': XBRL_API_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testAPI() {
  console.log('Testing Edge Function with JWT authentication...\n');

  // Test 1: Get companies
  try {
    console.log('Test 1: Getting companies list...');
    const response = await makeRequest('/markdown-files?limit=10');

    console.log('Response status:', response.status);

    if (response.ok) {
      const data = JSON.parse(response.data);
      console.log('✅ Success! Found data:', {
        count: data.data?.length || 0,
        tier: data.tier
      });

      // Show first few companies
      if (data.data && data.data.length > 0) {
        console.log('\nFirst few companies:');
        data.data.slice(0, 3).forEach(item => {
          console.log(`  - ${item.company_name} (${item.company_id})`);
        });
      }
    } else {
      console.log('❌ Failed:', response.data);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Search for Toyota
  try {
    console.log('Test 2: Searching for Toyota Motor Corporation...');
    const response = await makeRequest('/search-companies?query=' + encodeURIComponent('トヨタ') + '&limit=10');

    console.log('Response status:', response.status);

    if (response.ok) {
      const data = JSON.parse(response.data);
      console.log('✅ Success! Found companies:', {
        count: data.count || 0,
        searchQuery: data.search_query
      });

      // Show results
      if (data.companies && data.companies.length > 0) {
        console.log('\nSearch results:');
        data.companies.forEach(company => {
          console.log(`  - ${company.company_name} (${company.company_id})`);
          console.log(`    Fiscal years: ${company.fiscal_years.join(', ')}`);
        });
      } else {
        console.log('No companies found matching "トヨタ"');
      }
    } else {
      console.log('❌ Failed:', response.data);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testAPI();