#!/usr/bin/env node

// MCP Launcher - 環境変数を確実に設定してMCPサーバーを起動
const { spawn } = require('child_process');

console.error('[MCP Launcher] Starting with environment variables...');

// 環境変数を設定
const env = {
  ...process.env,
  SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU',
  XBRL_API_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway',
  XBRL_API_KEY: 'fin_live_4aa1e0700fd449f0a539d92f325b09aa'
};

console.error(`[MCP Launcher] SUPABASE_URL: ${env.SUPABASE_URL}`);
console.error(`[MCP Launcher] XBRL_API_URL: ${env.XBRL_API_URL}`);
console.error(`[MCP Launcher] XBRL_API_KEY: ${env.XBRL_API_KEY.substring(0, 10)}...`);
console.error(`[MCP Launcher] SUPABASE_ANON_KEY: ${env.SUPABASE_ANON_KEY.substring(0, 10)}...`);

// MCPサーバーを起動（Windowsの場合はshell:trueが必要）
const mcp = spawn('npx', ['shared-supabase-mcp-minimal@latest'], {
  env: env,
  stdio: 'inherit',
  shell: true  // Windowsではshell:trueでnpxを実行
});

mcp.on('error', (err) => {
  console.error('[MCP Launcher] Failed to start:', err);
  process.exit(1);
});

mcp.on('exit', (code) => {
  console.error(`[MCP Launcher] Process exited with code ${code}`);
  process.exit(code);
});

// Ctrl+Cの処理
process.on('SIGINT', () => {
  mcp.kill();
  process.exit();
});