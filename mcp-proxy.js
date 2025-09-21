#!/usr/bin/env node

// MCP Proxy Server - URLのスペースバグを修正するプロキシ
const { spawn } = require('child_process');
const readline = require('readline');

// 環境変数を設定
process.env.SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';
process.env.XBRL_API_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway';
process.env.XBRL_API_KEY = 'fin_live_4aa1e0700fd449f0a539d92f325b09aa';

// MCPサーバーを起動
const mcp = spawn('npx', ['shared-supabase-mcp-minimal@latest'], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// 標準入力を転送
process.stdin.pipe(mcp.stdin);

// 標準出力を監視してURLを修正
const rl = readline.createInterface({
  input: mcp.stdout,
  terminal: false
});

rl.on('line', (line) => {
  // URLのスペースバグを修正
  const fixedLine = line.replace(/gateway\s+\//g, 'gateway/').replace(/gateway%20\//g, 'gateway/');
  console.log(fixedLine);
});

// 標準エラー出力を転送
mcp.stderr.pipe(process.stderr);

// プロセス終了時の処理
mcp.on('close', (code) => {
  process.exit(code);
});

process.on('SIGINT', () => {
  mcp.kill();
  process.exit();
});