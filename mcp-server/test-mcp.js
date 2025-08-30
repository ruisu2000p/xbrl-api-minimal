#!/usr/bin/env node

console.error('[TEST] Starting test MCP server...');

// 5秒ごとにハートビート
setInterval(() => {
  console.error('[TEST] Server is still running...');
}, 5000);

// プロセスを維持
process.stdin.resume();