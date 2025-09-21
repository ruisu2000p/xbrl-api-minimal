// Check gateway-simple config endpoint
async function checkConfig() {
  const url = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple/config';

  console.log('Fetching config from:', url);

  try {
    const response = await fetch(url);
    console.log('Status:', response.status);

    if (response.ok) {
      const config = await response.json();
      console.log('\nConfig received:');
      console.log('- name:', config.name);
      console.log('- version:', config.version);
      console.log('- supabaseUrl:', config.supabaseUrl || 'NOT FOUND ❌');
      console.log('- supabaseAnonKey:', config.supabaseAnonKey ? 'Present ✓' : 'NOT FOUND ❌');
      console.log('- endpoints:', JSON.stringify(config.endpoints, null, 2));

      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        console.log('\n⚠️ ERROR: Config is missing required fields!');
        console.log('The MCP server needs supabaseUrl and supabaseAnonKey');
      }
    } else {
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('Failed:', error.message);
  }
}

checkConfig();