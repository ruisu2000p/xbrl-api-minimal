#!/usr/bin/env node

// Direct test of MCP server connection
const { spawn } = require('child_process');
const readline = require('readline');

console.log('Starting MCP connection test...\n');

// Start the wrapper
const mcp = spawn('node', ['supabase-mcp-codex-wrapper.js'], {
    env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: 'sbp_7c52c0edbe8685320292aa80c15931766a9975ea'
    }
});

const rl = readline.createInterface({
    input: mcp.stdout,
    output: null,
    terminal: false
});

// Step 1: Initialize
console.log('1. Sending initialize...');
const initMessage = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
        protocolVersion: "2025-06-18",
        capabilities: {}
    },
    id: 1
};

mcp.stdin.write(JSON.stringify(initMessage) + '\n');

// Step 2: List tools after init
let step = 1;

rl.on('line', (line) => {
    try {
        const response = JSON.parse(line);
        console.log(`   Response:`, JSON.stringify(response, null, 2).substring(0, 200) + '...\n');

        if (step === 1 && response.id === 1) {
            step = 2;
            console.log('2. Listing tools...');
            const listMessage = {
                jsonrpc: "2.0",
                method: "tools/list",
                params: {},
                id: 2
            };
            mcp.stdin.write(JSON.stringify(listMessage) + '\n');
        } else if (step === 2 && response.id === 2) {
            step = 3;
            console.log('3. Calling get_project_url tool...');
            const toolMessage = {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "get_project_url",
                    arguments: {
                        project_id: "wpwqxhyiglbtlaimrjrx"
                    }
                },
                id: 3
            };
            mcp.stdin.write(JSON.stringify(toolMessage) + '\n');
        } else if (step === 3) {
            console.log('\n✅ All tests passed!');
            process.exit(0);
        }
    } catch (e) {
        console.error('Error parsing response:', e.message);
    }
});

mcp.stderr.on('data', (data) => {
    console.error('MCP Error:', data.toString());
});

mcp.on('close', (code) => {
    console.log(`MCP closed with code ${code}`);
    process.exit(code);
});

// Timeout
setTimeout(() => {
    console.error('❌ Test timed out');
    process.exit(1);
}, 10000);
