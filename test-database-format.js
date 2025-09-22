// Test database format and check why MCP server only sees limited companies

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!ANON_KEY) {
  console.error('Error: SUPABASE_ANON_KEY environment variable is required');
  console.log('Please set it using:');
  console.log('export SUPABASE_ANON_KEY="your-anon-key"');
  process.exit(1);
}

async function testDatabase() {
  console.log('=== Database Format Testing ===\n');

  // 1. Check fiscal_year format in metadata table
  console.log('1. Checking fiscal_year format in markdown_files_metadata:');
  const metadataResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/markdown_files_metadata?select=fiscal_year,company_id,company_name&limit=10`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    }
  );

  if (metadataResponse.ok) {
    const metadata = await metadataResponse.json();
    console.log('Sample records:', metadata);
    if (metadata.length > 0) {
      console.log('Fiscal year format:', metadata[0].fiscal_year);
    }
  } else {
    console.log('Error fetching metadata:', metadataResponse.status);
  }

  // 2. Check if companies table exists
  console.log('\n2. Checking companies table:');
  const companiesResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?select=*&limit=5`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    }
  );

  if (companiesResponse.ok) {
    const companies = await companiesResponse.json();
    console.log(`Companies table exists with ${companies.length} rows sampled`);
    if (companies.length > 0) {
      console.log('Sample company:', companies[0]);
    }
  } else {
    const errorText = await companiesResponse.text();
    console.log('Companies table not found or error:', errorText);
  }

  // 3. Get all unique fiscal years using RPC
  console.log('\n3. Getting unique fiscal years:');
  const yearsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/execute_sql`,
    {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'SELECT DISTINCT fiscal_year FROM markdown_files_metadata ORDER BY fiscal_year'
      })
    }
  );

  if (yearsResponse.ok) {
    const yearsData = await yearsResponse.json();
    if (yearsData.data) {
      const years = yearsData.data.map(y => y.fiscal_year);
      console.log('Unique fiscal years:', years);
    } else {
      console.log('Response:', yearsData);
    }
  } else {
    console.log('Error getting years:', await yearsResponse.text());
  }

  // 4. Test search with exact fiscal_year format
  console.log('\n4. Testing search with different fiscal_year formats:');

  // Test with FY format
  const searchFY = await fetch(
    `${SUPABASE_URL}/rest/v1/markdown_files_metadata?fiscal_year=eq.FY2024&limit=5`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    }
  );

  if (searchFY.ok) {
    const dataFY = await searchFY.json();
    console.log(`With FY2024: ${dataFY.length} records found`);
  }

  // Test without FY
  const search2024 = await fetch(
    `${SUPABASE_URL}/rest/v1/markdown_files_metadata?fiscal_year=eq.2024&limit=5`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    }
  );

  if (search2024.ok) {
    const data2024 = await search2024.json();
    console.log(`With 2024: ${data2024.length} records found`);
  }

  // 5. Check company_master table
  console.log('\n5. Checking company_master table:');
  const masterResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/company_master?select=*&limit=5`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    }
  );

  if (masterResponse.ok) {
    const masterData = await masterResponse.json();
    console.log(`company_master table has ${masterData.length} rows sampled`);
    if (masterData.length > 0) {
      console.log('Sample record:', masterData[0]);
    }
  } else {
    console.log('company_master table error:', await masterResponse.text());
  }

  // 6. Search for specific companies
  console.log('\n6. Testing company searches:');

  const toyotaSearch = await fetch(
    `${SUPABASE_URL}/rest/v1/markdown_files_metadata?company_name=ilike.*トヨタ*&select=company_id,company_name,fiscal_year&limit=5`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    }
  );

  if (toyotaSearch.ok) {
    const toyotaData = await toyotaSearch.json();
    console.log(`Toyota search: ${toyotaData.length} records found`);
    if (toyotaData.length > 0) {
      console.log('Toyota records:', toyotaData);
    }
  }

  // 7. Check total counts
  console.log('\n7. Getting total counts:');
  const countResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/execute_sql`,
    {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          SELECT
            COUNT(DISTINCT company_id) as total_companies,
            COUNT(*) as total_files,
            COUNT(DISTINCT fiscal_year) as total_years
          FROM markdown_files_metadata
        `
      })
    }
  );

  if (countResponse.ok) {
    const countData = await countResponse.json();
    console.log('Database stats:', countData.data[0]);
  }
}

testDatabase().catch(console.error);