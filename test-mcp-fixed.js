// Test the fixed MCP server to verify it can see all companies

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Set environment variables
process.env.XBRL_API_KEY = 'xbrl_v1_4193e7523980d0464c1e9794b6c98535';
process.env.SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';

// Start the MCP server
const mcp = spawn('node', ['xbrl-mcp-server-fixed.js'], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

const rl = createInterface({
  input: mcp.stdout,
  output: process.stdout,
  terminal: false
});

// Handle server output
mcp.stderr.on('data', (data) => {
  console.error(`[SERVER] ${data.toString()}`);
});

// Send test commands
async function test() {
  console.log('Testing Fixed MCP Server...\n');

  // Test 1: Get database stats
  const statsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get-database-stats',
      arguments: {}
    }
  };

  console.log('1. Testing get-database-stats...');
  mcp.stdin.write(JSON.stringify(statsRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: List companies
  const listRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'list-companies',
      arguments: { limit: 10 }
    }
  };

  console.log('\n2. Testing list-companies (limit=10)...');
  mcp.stdin.write(JSON.stringify(listRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Search for Toyota
  const searchRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search-companies',
      arguments: { query: 'トヨタ' }
    }
  };

  console.log('\n3. Testing search-companies (query=トヨタ)...');
  mcp.stdin.write(JSON.stringify(searchRequest) + '\n');

  // Wait and close
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n\nTest complete. Closing server...');
  mcp.kill();
}

// Handle responses
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    if (response.result && response.result.content) {
      console.log('Response:', response.result.content[0].text);
    }
  } catch (e) {
    // Protocol messages, ignore
  }
});

// Run tests
test().catch(console.error);