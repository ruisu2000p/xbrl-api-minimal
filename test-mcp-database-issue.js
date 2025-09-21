// Test why MCP server only recognizes 36 companies when database has 12,752

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const TEST_API_KEY = 'xbrl_v1_4193e7523980d0464c1e9794b6c98535';  // Using test API key

async function testViaMCP() {
  console.log('=== Testing MCP Database Issue ===\n');

  try {
    // 1. Test via api-proxy
    console.log('1. Testing via api-proxy endpoint:');
    const proxyResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/api-proxy/query-data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_API_KEY
        },
        body: JSON.stringify({
          query: `
            SELECT
              fiscal_year,
              COUNT(DISTINCT company_id) as companies,
              COUNT(*) as files
            FROM markdown_files_metadata
            GROUP BY fiscal_year
            ORDER BY fiscal_year
          `
        })
      }
    );

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      console.log('Fiscal year stats:');
      console.table(data.data);

      // Sum totals
      const totals = data.data.reduce((acc, row) => ({
        companies: acc.companies + parseInt(row.companies),
        files: acc.files + parseInt(row.files)
      }), { companies: 0, files: 0 });

      console.log('\nTotal unique companies:', totals.companies);
      console.log('Total files:', totals.files);
    } else {
      console.log('Error:', await proxyResponse.text());
    }

    // 2. Check fiscal_year format
    console.log('\n2. Checking fiscal_year format:');
    const formatResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/api-proxy/query-data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_API_KEY
        },
        body: JSON.stringify({
          query: `
            SELECT DISTINCT fiscal_year
            FROM markdown_files_metadata
            ORDER BY fiscal_year
            LIMIT 10
          `
        })
      }
    );

    if (formatResponse.ok) {
      const formatData = await formatResponse.json();
      console.log('Fiscal year formats:', formatData.data.map(r => r.fiscal_year));

      // Check if they are FY format or just numbers
      const firstYear = formatData.data[0]?.fiscal_year;
      if (firstYear) {
        console.log(`Format detected: ${firstYear.startsWith('FY') ? 'FY prefix' : 'Number only'}`);
      }
    }

    // 3. Check if companies table exists
    console.log('\n3. Checking companies table:');
    const companiesResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/api-proxy/query-data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_API_KEY
        },
        body: JSON.stringify({
          query: `
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_name = 'companies'
              AND table_schema = 'public'
          `
        })
      }
    );

    if (companiesResponse.ok) {
      const companiesData = await companiesResponse.json();
      const exists = companiesData.data[0]?.count === '1';
      console.log('companies table exists:', exists);

      if (exists) {
        // Count rows in companies table
        const countResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/api-proxy/query-data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': TEST_API_KEY
            },
            body: JSON.stringify({
              query: 'SELECT COUNT(*) as count FROM companies'
            })
          }
        );

        if (countResponse.ok) {
          const countData = await countResponse.json();
          console.log('Rows in companies table:', countData.data[0]?.count);
        }
      }
    }

    // 4. Check company_master table
    console.log('\n4. Checking company_master table:');
    const masterResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/api-proxy/query-data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_API_KEY
        },
        body: JSON.stringify({
          query: `
            SELECT COUNT(DISTINCT doc_id) as companies,
                   COUNT(*) as total_rows
            FROM company_master
          `
        })
      }
    );

    if (masterResponse.ok) {
      const masterData = await masterResponse.json();
      console.log('company_master stats:', masterData.data[0]);
    }

    // 5. Search for Toyota
    console.log('\n5. Testing Toyota search via api-proxy:');
    const toyotaResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/api-proxy/search-companies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_API_KEY
        },
        body: JSON.stringify({
          query: 'トヨタ',
          limit: 5
        })
      }
    );

    if (toyotaResponse.ok) {
      const toyotaData = await toyotaResponse.json();
      console.log(`Found ${toyotaData.companies?.length || 0} results for Toyota`);
      if (toyotaData.companies?.length > 0) {
        console.log('First result:', toyotaData.companies[0]);
      }
    } else {
      console.log('Toyota search error:', await toyotaResponse.text());
    }

    // 6. Get sample companies with proper names
    console.log('\n6. Sample companies with proper names:');
    const sampleResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/api-proxy/query-data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_API_KEY
        },
        body: JSON.stringify({
          query: `
            SELECT DISTINCT company_id, company_name, fiscal_year
            FROM markdown_files_metadata
            WHERE company_name NOT LIKE '%_company'
              AND company_name IS NOT NULL
            ORDER BY company_name
            LIMIT 10
          `
        })
      }
    );

    if (sampleResponse.ok) {
      const sampleData = await sampleResponse.json();
      console.log('Sample companies with proper names:');
      console.table(sampleData.data);
    }

    // 7. Check why MCP might be limited
    console.log('\n7. Investigating potential MCP limitations:');

    // Check if there's a view or filtered table
    const viewsResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/api-proxy/query-data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TEST_API_KEY
        },
        body: JSON.stringify({
          query: `
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND (table_name LIKE '%compan%' OR table_name LIKE '%financial%')
            ORDER BY table_name
          `
        })
      }
    );

    if (viewsResponse.ok) {
      const viewsData = await viewsResponse.json();
      console.log('Related tables and views:');
      console.table(viewsData.data);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testViaMCP();