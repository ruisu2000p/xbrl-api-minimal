// Test the MCP package directly
const { spawn } = require('child_process');

console.log('Testing shared-supabase-mcp-minimal package...\n');

// Set environment variables
const env = {
  ...process.env,
  XBRL_API_KEY: 'xbrl_live_v1_73f62ff5-dd8b-4e50-aff8-943491d4b725_6zi3ZHiytMsT/+DYneku7CNvXpc7UNrI',
  XBRL_API_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple'
};

console.log('Environment variables:');
console.log('- XBRL_API_KEY:', env.XBRL_API_KEY.substring(0, 30) + '...');
console.log('- XBRL_API_URL:', env.XBRL_API_URL);
console.log();

// Spawn the MCP server
const mcp = spawn('npx', ['shared-supabase-mcp-minimal'], {
  env: env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle stdout
mcp.stdout.on('data', (data) => {
  console.log('[STDOUT]:', data.toString());
});

// Handle stderr
mcp.stderr.on('data', (data) => {
  console.error('[STDERR]:', data.toString());
});

// Handle errors
mcp.on('error', (error) => {
  console.error('[ERROR]:', error);
});

// Handle exit
mcp.on('exit', (code) => {
  console.log('[EXIT] Process exited with code:', code);
});

// Send initialization message after a short delay
setTimeout(() => {
  const initMessage = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  }) + '\n';

  console.log('Sending initialize message...');
  mcp.stdin.write(initMessage);
}, 1000);

// Close after 5 seconds
setTimeout(() => {
  console.log('\nClosing test...');
  mcp.stdin.end();
  process.exit(0);
}, 5000);