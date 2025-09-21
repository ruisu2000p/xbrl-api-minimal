// Test the fixed MCP server
const { spawn } = require("child_process");
const { join } = require('path');

// __dirname is available in CommonJS

// MCP Client class to test the server
class MCPClient {
  constructor() {
    this.server = null;
    this.requestId = 1;
  }

  async start() {
    return new Promise((resolve, reject) => {
      console.log('Starting MCP server...');

      const serverPath = join(__dirname, 'xbrl-api-minimal', 'infrastructure', 'mcp-server', 'index.js');

      this.server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
          SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODY0ODQwMjksImV4cCI6MjAwMjA2MDAyOX0.ByVgKJpDQeCdEPz4k2FZpb4OMoWbqkxwQZPqyGJMX_w'
        }
      });

      this.server.stderr.on('data', (data) => {
        const message = data.toString();
        console.log('[SERVER STDERR]:', message.trim());

        if (message.includes('MCP server started successfully')) {
          setTimeout(() => resolve(), 1000); // Give it a moment to fully initialize
        }
      });

      this.server.on('error', (error) => {
        console.error('Failed to start server:', error);
        reject(error);
      });

      this.server.on('exit', (code) => {
        console.log(`Server exited with code ${code}`);
      });

      // Set timeout for server start
      setTimeout(() => {
        reject(new Error('Server start timeout'));
      }, 10000);
    });
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: "2.0",
        id: this.requestId++,
        method: method,
        params: params
      };

      let responseBuffer = '';

      const onData = (data) => {
        responseBuffer += data.toString();
        try {
          const response = JSON.parse(responseBuffer);
          this.server.stdout.removeListener('data', onData);
          resolve(response);
        } catch (e) {
          // Continue accumulating data
        }
      };

      this.server.stdout.on('data', onData);

      // Set timeout for this request
      setTimeout(() => {
        this.server.stdout.removeListener('data', onData);
        reject(new Error(`Request timeout for ${method}`));
      }, 5000);

      this.server.stdin.write(JSON.stringify(request) + '\\n');
    });
  }

  async stop() {
    if (this.server) {
      this.server.kill();
    }
  }
}

async function testMCPServer() {
  const client = new MCPClient();

  try {
    console.log('Testing fixed MCP server...\\n');

    // Start the server
    await client.start();
    console.log('✅ MCP server started successfully\\n');

    // Test 1: List tools
    console.log('1. Testing tools/list:');
    try {
      const toolsResponse = await client.sendRequest('tools/list');
      console.log('   Status: Success');
      console.log('   Tools count:', toolsResponse.result?.tools?.length || 0);
      if (toolsResponse.result?.tools) {
        toolsResponse.result.tools.forEach(tool => {
          console.log(`   - ${tool.name}: ${tool.description}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    console.log('\\n2. Testing search-documents tool:');
    try {
      const searchResponse = await client.sendRequest('tools/call', {
        name: 'search-documents',
        arguments: {
          company: 'トヨタ',
          limit: 3
        }
      });
      console.log('   Status: Success');
      console.log('   Response type:', typeof searchResponse.result);
      if (searchResponse.result?.content) {
        const content = searchResponse.result.content[0]?.text || '';
        const lines = content.split('\\n').slice(0, 5); // First 5 lines
        console.log('   Content preview:');
        lines.forEach(line => console.log(`   ${line}`));
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    console.log('\\n3. Testing search-documents with different company:');
    try {
      const searchResponse = await client.sendRequest('tools/call', {
        name: 'search-documents',
        arguments: {
          company: 'ソニー',
          fiscal_year: 'FY2024',
          limit: 2
        }
      });
      console.log('   Status: Success');
      console.log('   Response type:', typeof searchResponse.result);
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await client.stop();
    console.log('\\n✅ MCP server test completed');
  }
}

// Run the test
testMCPServer().catch(console.error);