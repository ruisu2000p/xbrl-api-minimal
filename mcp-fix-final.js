#!/usr/bin/env node

// MCP URL修正プロキシ（最終版）
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// プロキシサーバーのポート
const PROXY_PORT = 8899;
const GATEWAY_HOST = 'wpwqxhyiglbtlaimrjrx.supabase.co';
const GATEWAY_PATH = '/functions/v1/gateway';

// ログファイル（デバッグ用）
const LOG_FILE = path.join(process.env.TEMP || '/tmp', 'mcp-proxy.log');
const log = (msg) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${timestamp} ${msg}\n`);
};

// プロキシサーバーが起動してからMCPサーバーを起動
const startMcpServer = () => {
  // 環境変数を明示的に設定
  const mcpEnv = {
    ...process.env,
    SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU',
    XBRL_API_URL: `http://localhost:${PROXY_PORT}`,
    XBRL_API_KEY: 'fin_live_4aa1e0700fd449f0a539d92f325b09aa'
  };

  log('[ENV] SUPABASE_URL=' + mcpEnv.SUPABASE_URL);
  log('[ENV] XBRL_API_URL=' + mcpEnv.XBRL_API_URL);
  log('[ENV] XBRL_API_KEY=' + mcpEnv.XBRL_API_KEY.substring(0, 10) + '...');
  log('[PROXY] Starting MCP server with environment variables...');

  // MCPサーバー起動
  const mcp = spawn('npx', ['shared-supabase-mcp-minimal@latest'], {
    env: mcpEnv,
    stdio: 'inherit',
    shell: true,
    windowsHide: true
  });

  mcp.on('error', (err) => {
    log(`[MCP ERROR] ${err.message}`);
    process.exit(1);
  });

  mcp.on('close', (code) => {
    log(`[MCP] Process exited with code ${code}`);
    process.exit(code);
  });

  // 終了処理
  process.on('SIGINT', () => {
    log('[PROXY] Shutting down...');
    mcp.kill();
    process.exit();
  });

  return mcp;
};

// プロキシサーバー作成
const server = http.createServer((req, res) => {
  // URLのスペースバグを修正
  let fixedPath = req.url
    .replace(/gateway\s+\//g, 'gateway/')  // "gateway /" → "gateway/"
    .replace(/gateway%20\//g, 'gateway/')  // "gateway%20/" → "gateway/"
    .replace(/\/+/g, '/');                 // 重複スラッシュ除去

  log(`[PROXY] ${req.method} ${req.url} → ${GATEWAY_PATH}${fixedPath}`);

  // Supabase Gatewayへリクエスト転送
  const options = {
    hostname: GATEWAY_HOST,
    port: 443,
    path: GATEWAY_PATH + fixedPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: GATEWAY_HOST
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    log(`[PROXY] Response: ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    log(`[PROXY ERROR] ${err.message}`);
    res.writeHead(500);
    res.end('Proxy Error');
  });

  req.pipe(proxyReq);
});

// プロキシサーバー起動
server.listen(PROXY_PORT, 'localhost', () => {
  log(`[PROXY] Started on http://localhost:${PROXY_PORT}`);
  log(`[PROXY] Redirecting to: https://${GATEWAY_HOST}${GATEWAY_PATH}`);
  log(`[PROXY] Log file: ${LOG_FILE}`);

  // プロキシが起動してからMCPサーバーを起動
  const mcp = startMcpServer();

  server.on('close', () => {
    mcp.kill();
  });
});