// Test MCP server configuration endpoints
async function testMcpEndpoints() {
  console.log('Testing MCP server configuration endpoints...\n');

  const endpoints = [
    {
      name: 'Gateway Simple Config',
      url: 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple/config',
      headers: {}
    },
    {
      name: 'Vercel API Config',
      url: 'https://xbrl-api-minimal.vercel.app/api/v1/config',
      headers: {}
    },
    {
      name: 'XBRL API Config (Edge Function)',
      url: 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-config',
      headers: {}
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}`);
    console.log(`URL: ${endpoint.url}`);

    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: endpoint.headers
      });

      console.log(`Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success!');
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...\n');
      } else {
        const error = await response.text();
        console.log('❌ Error:', error.substring(0, 200) + '\n');
      }
    } catch (error) {
      console.log('❌ Network error:', error.message + '\n');
    }
  }

  // Test the actual MCP server command
  console.log('\nTesting MCP server startup command:');
  console.log('Command: npx shared-supabase-mcp-minimal@latest');
  console.log('\nEnvironment variables needed:');
  console.log('- SUPABASE_URL: https://wpwqxhyiglbtlaimrjrx.supabase.co');
  console.log('- XBRL_API_KEY: xbrl_live_v1_73f62ff5-dd8b-4e50-aff8-943491d4b725_...');
  console.log('\nThe MCP server should now be able to:');
  console.log('1. Fetch config from: https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple/config');
  console.log('2. Authenticate with the provided API key');
  console.log('3. Access the XBRL financial data');
}

testMcpEndpoints();