#!/usr/bin/env node

// Test the wrapper with Codex protocol
const { spawn } = require('child_process');
const readline = require('readline');

console.error('Starting wrapper test...');

const wrapper = spawn('node', ['supabase-mcp-codex-wrapper.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

const rl = readline.createInterface({
    input: wrapper.stdout,
    output: null,
    terminal: false
});

// Test message
const testMessage = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
        protocolVersion: "2025-06-18",
        capabilities: {}
    },
    id: 1
};

console.error('Sending test message...');
wrapper.stdin.write(JSON.stringify(testMessage) + '\n');

rl.on('line', (line) => {
    console.log('Response:', line);
    process.exit(0);
});

wrapper.stderr.on('data', (data) => {
    console.error('Wrapper error:', data.toString());
});

wrapper.on('close', (code) => {
    console.error('Wrapper closed with code:', code);
    process.exit(code);
});

// Timeout
setTimeout(() => {
    console.error('Test timed out');
    wrapper.kill();
    process.exit(1);
}, 5000);
