#!/usr/bin/env node

// Test script for local MCP server
const { spawn } = require('child_process');
const readline = require('readline');

console.log('Testing local MCP server...');

// Start the local MCP server
const mcp = spawn('node', ['C:/Users/pumpk/supabase-mcp-local.js']);

const rl = readline.createInterface({
    input: mcp.stdout,
    output: null,
    terminal: false
});

let testStep = 0;
const tests = [
    {
        name: 'Initialize',
        message: {
            jsonrpc: "2.0",
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {}
            },
            id: 1
        }
    },
    {
        name: 'List Tools',
        message: {
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 2
        }
    },
    {
        name: 'Call get_project_url',
        message: {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "get_project_url",
                arguments: {}
            },
            id: 3
        }
    }
];

rl.on('line', (line) => {
    try {
        const response = JSON.parse(line);
        console.log(`✓ ${tests[testStep].name}: Received response`);
        console.log('  Response:', JSON.stringify(response, null, 2));

        testStep++;
        if (testStep < tests.length) {
            runNextTest();
        } else {
            console.log('\n✅ All tests passed!');
            process.exit(0);
        }
    } catch (e) {
        console.error(`✗ Failed to parse response: ${e.message}`);
        console.error(`  Raw output: ${line}`);
    }
});

mcp.stderr.on('data', (data) => {
    console.error(`MCP Error: ${data}`);
});

mcp.on('close', (code) => {
    console.log(`MCP server exited with code ${code}`);
    process.exit(code);
});

function runNextTest() {
    console.log(`\nRunning test ${testStep + 1}: ${tests[testStep].name}`);
    mcp.stdin.write(JSON.stringify(tests[testStep].message) + '\n');
}

// Start tests
runNextTest();

// Timeout after 10 seconds
setTimeout(() => {
    console.error('✗ Test timed out');
    process.exit(1);
}, 10000);