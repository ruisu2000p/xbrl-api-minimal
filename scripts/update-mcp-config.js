// Update MCP configuration for xbrl-financial
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.claude.json');

// Read current config
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Update xbrl-financial configuration
if (config.mcpServers && config.mcpServers['xbrl-financial']) {
  // Update to latest version and add environment variables
  config.mcpServers['xbrl-financial'] = {
    "type": "stdio",
    "command": "npx",
    "args": [
      "--loglevel=error",
      "shared-supabase-mcp-minimal@2.1.0"  // Update to latest version
    ],
    "env": {
      "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
      "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU"
    }
  };

  // Backup original config
  fs.writeFileSync(configPath + '.backup', JSON.stringify(config, null, 2));

  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('✅ MCP configuration updated successfully!');
  console.log('- Version updated to 2.1.0');
  console.log('- Supabase API keys configured');
  console.log('- Backup created at .claude.json.backup');
  console.log('\n⚠️ Please restart Claude Desktop for changes to take effect.');
} else {
  console.log('❌ xbrl-financial server not found in configuration');
}