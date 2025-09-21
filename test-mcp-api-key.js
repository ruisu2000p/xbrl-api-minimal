// Test API key generation and usage for MCP server
const crypto = require('crypto');

// Generate a proper XBRL API key
function generateXBRLApiKey() {
  const prefix = 'xbrl_live_v1';
  const uuid = crypto.randomUUID();
  const random = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${uuid}_${random}`;
}

// Generate key
const newApiKey = generateXBRLApiKey();
console.log('Generated XBRL API Key:');
console.log(newApiKey);
console.log('\n');

// Configuration for .claude.json
const mcpConfig = {
  "mcpServers": {
    "xbrl-financial": {
      "command": "node",
      "args": ["C:\\\\Users\\\\pumpk\\\\xbrl-mcp-server\\\\index.js"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "XBRL_API_KEY": newApiKey
      }
    }
  }
};

console.log('MCP Server Configuration for .claude.json:');
console.log(JSON.stringify(mcpConfig, null, 2));
console.log('\n');

// Test with current Supabase service key
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODIxOTU0MSwiZXhwIjoyMDczNzk1NTQxfQ.ZFdKgGDXbmRPyyOugvAGF4cK5sxQ_DGtGG1imxsU7So';

// Alternative configuration using service key directly
const alternativeConfig = {
  "mcpServers": {
    "xbrl-financial": {
      "command": "node",
      "args": ["C:\\\\Users\\\\pumpk\\\\xbrl-mcp-server\\\\index.js"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "XBRL_API_KEY": SUPABASE_SERVICE_KEY  // Use service key as API key
      }
    }
  }
};

console.log('Alternative Configuration (using Service Key):');
console.log(JSON.stringify(alternativeConfig, null, 2));
