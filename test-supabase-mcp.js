// Test Supabase MCP Server connection

const { spawn } = require('child_process');
const readline = require('readline');

async function testSupabaseMCP() {
    console.log('Starting Supabase MCP server test...\n');

    // Start the MCP server
    const mcpProcess = spawn('npx', [
        '-y',
        '@supabase/mcp-server-supabase@latest',
        '--read-only',
        '--project-ref=wpwqxhyiglbtlaimrjrx'
    ], {
        env: {
            ...process.env,
            SUPABASE_ACCESS_TOKEN: 'sbp_7c52c0edbe8685320292aa80c15931766a9975ea'
        },
        shell: true
    });

    // Create readline interface for stdin/stdout
    const rl = readline.createInterface({
        input: mcpProcess.stdout,
        output: process.stdin
    });

    // Handle server output
    mcpProcess.stdout.on('data', (data) => {
        console.log('Server output:', data.toString());
    });

    mcpProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
    });

    // Send initialization message (JSON-RPC format for MCP)
    const initMessage = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
                name: 'test-client',
                version: '1.0.0'
            }
        }
    }) + '\n';

    console.log('Sending initialization message...');
    mcpProcess.stdin.write(initMessage);

    // Wait for response
    setTimeout(() => {
        // Send list tools request
        const listToolsMessage = JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        }) + '\n';

        console.log('\nSending list tools request...');
        mcpProcess.stdin.write(listToolsMessage);
    }, 2000);

    // Clean exit after 5 seconds
    setTimeout(() => {
        console.log('\nTest completed. Closing connection...');
        mcpProcess.kill();
        process.exit(0);
    }, 5000);
}

// Run the test
testSupabaseMCP().catch(console.error);