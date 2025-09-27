#!/usr/bin/env node

// Test Codex protocol version compatibility
const { spawn } = require('child_process');
const readline = require('readline');

console.log('Testing Codex protocol compatibility...');

// Start the local MCP server v2
const mcp = spawn('node', ['supabase-mcp-local-v2.js']);

const rl = readline.createInterface({
    input: mcp.stdout,
    output: null,
    terminal: false
});

// Test with Codex's protocol version
const initMessage = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
        protocolVersion: "2025-06-18",  // Codex's version
        capabilities: {}
    },
    id: 1
};

console.log('Sending initialization with Codex protocol version 2025-06-18...');
mcp.stdin.write(JSON.stringify(initMessage) + '\n');

rl.on('line', (line) => {
    try {
        const response = JSON.parse(line);
        if (response.id === 1) {
            if (response.result && response.result.protocolVersion === '2025-06-18') {
                console.log('✅ SUCCESS: Server accepted Codex protocol version!');
                console.log('Server info:', response.result.serverInfo);

                // Test tools/list
                const listToolsMessage = {
                    jsonrpc: "2.0",
                    method: "tools/list",
                    params: {},
                    id: 2
                };
                mcp.stdin.write(JSON.stringify(listToolsMessage) + '\n');
            } else if (response.error) {
                console.log('❌ ERROR: Server rejected protocol version');
                console.log('Error:', response.error);
                process.exit(1);
            }
        } else if (response.id === 2) {
            console.log('✅ Tools list received:', response.result.tools.length, 'tools available');
            response.result.tools.forEach(tool => {
                console.log(`  - ${tool.name}: ${tool.description}`);
            });
            process.exit(0);
        }
    } catch (e) {
        console.error(`Failed to parse response: ${e.message}`);
    }
});

mcp.stderr.on('data', (data) => {
    console.error(`MCP stderr: ${data}`);
});

mcp.on('close', (code) => {
    console.log(`MCP server exited with code ${code}`);
    process.exit(code);
});

// Timeout after 5 seconds
setTimeout(() => {
    console.error('Test timed out');
    process.exit(1);
}, 5000);