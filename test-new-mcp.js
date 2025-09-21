#!/usr/bin/env node
// Direct test of MCP server with API key

const { spawn } = require('child_process');

// MCP server configuration
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const XBRL_API_KEY = 'xbrl_v1_3498974e5a029c0a0f47e9c18847a417';

console.log('Starting MCP server with API key authentication...');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('XBRL_API_KEY:', XBRL_API_KEY);

// Start MCP server
const serverProcess = spawn('npx', ['shared-supabase-mcp-minimal@4.1.0'], {
  env: {
    ...process.env,
    SUPABASE_URL,
    XBRL_API_KEY
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
let responseBuffer = '';

serverProcess.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      try {
        const response = JSON.parse(line);
        console.log('\n=== Response ===');
        console.log(JSON.stringify(response, null, 2));
      } catch (e) {
        // Not a complete JSON yet
      }
    }
  }
  responseBuffer = lines[lines.length - 1];
});

serverProcess.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Send test commands
setTimeout(() => {
  console.log('\n=== Sending initialize request ===');
  const initRequest = JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {}
    },
    id: 1
  });

  serverProcess.stdin.write(initRequest + '\n');
}, 500);

setTimeout(() => {
  console.log('\n=== Sending tools/list request ===');
  const listRequest = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  });

  serverProcess.stdin.write(listRequest + '\n');
}, 1500);

setTimeout(() => {
  console.log('\n=== Sending search_companies request for "Toyota" ===');
  const searchRequest = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'search_companies',
      arguments: {
        company_name: 'Toyota',
        limit: 3
      }
    },
    id: 3
  });

  serverProcess.stdin.write(searchRequest + '\n');
}, 2500);

// Cleanup after 5 seconds
setTimeout(() => {
  console.log('\n=== Test complete, terminating server ===');
  serverProcess.kill();
  process.exit(0);
}, 5000);