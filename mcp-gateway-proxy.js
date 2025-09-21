#!/usr/bin/env node

// MCP Gateway Proxy - Authorizationヘッダーを自動追加してJWT認証をバイパス
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// プロキシ設定
const PROXY_PORT = 8900;
const GATEWAY_HOST = 'wpwqxhyiglbtlaimrjrx.supabase.co';
const GATEWAY_PATH = '/functions/v1/gateway';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// ログファイル
const LOG_FILE = path.join(process.env.TEMP || '/tmp', 'mcp-gateway-proxy.log');
const log = (msg) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `${timestamp} ${msg}\n`);
};

// プロキシサーバー
const server = http.createServer((req, res) => {
  // URLのスペースバグも修正
  let fixedPath = req.url
    .replace(/gateway\s+\//g, 'gateway/')
    .replace(/gateway%20\//g, 'gateway/')
    .replace(/\/+/g, '/');

  // もし /gateway だけなら /gateway/config にリダイレクト
  if (fixedPath === '/gateway' || fixedPath === '/gateway/') {
    fixedPath = '/gateway/config';
  }

  log(`[PROXY] ${req.method} ${req.url} → ${GATEWAY_PATH}${fixedPath}`);

  // Gatewayへの転送時にAuthorizationヘッダーを追加
  const headers = {
    ...req.headers,
    'Authorization': `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY,
    'host': GATEWAY_HOST
  };

  // x-api-keyがあれば維持
  if (req.headers['x-api-key']) {
    headers['x-api-key'] = req.headers['x-api-key'];
  }

  const options = {
    hostname: GATEWAY_HOST,
    port: 443,
    path: GATEWAY_PATH + fixedPath,
    method: req.method,
    headers: headers
  };

  const proxyReq = https.request(options, (proxyRes) => {
    log(`[PROXY] Response: ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    log(`[PROXY ERROR] ${err.message}`);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Proxy Error', message: err.message }));
  });

  req.pipe(proxyReq);
});

// サーバー起動
server.listen(PROXY_PORT, 'localhost', () => {
  log(`[PROXY] Started on http://localhost:${PROXY_PORT}`);
  log(`[PROXY] Forwarding to: https://${GATEWAY_HOST}${GATEWAY_PATH}`);
  log(`[PROXY] Log file: ${LOG_FILE}`);

  // 環境変数設定（プロキシ経由）
  const mcpEnv = {
    ...process.env,
    SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
    SUPABASE_ANON_KEY: ANON_KEY,
    XBRL_API_URL: `http://localhost:${PROXY_PORT}/gateway`,
    XBRL_API_KEY: 'fin_live_4aa1e0700fd449f0a539d92f325b09aa'
  };

  log('[PROXY] Starting MCP server...');
  log(`[PROXY] ENV - SUPABASE_URL: ${mcpEnv.SUPABASE_URL}`);
  log(`[PROXY] ENV - XBRL_API_URL: ${mcpEnv.XBRL_API_URL}`);
  log(`[PROXY] ENV - XBRL_API_KEY: ${mcpEnv.XBRL_API_KEY.substring(0, 10)}...`);

  // MCPサーバー起動（Windowsの環境変数設定）
  const mcp = spawn('cmd', ['/C',
    `set SUPABASE_URL=${mcpEnv.SUPABASE_URL} && ` +
    `set SUPABASE_ANON_KEY=${mcpEnv.SUPABASE_ANON_KEY} && ` +
    `set XBRL_API_URL=${mcpEnv.XBRL_API_URL} && ` +
    `set XBRL_API_KEY=${mcpEnv.XBRL_API_KEY} && ` +
    `npx shared-supabase-mcp-minimal@latest`
  ], {
    stdio: 'inherit',
    shell: false,
    windowsHide: true
  });

  mcp.on('error', (err) => {
    log(`[MCP ERROR] ${err.message}`);
    server.close();
    process.exit(1);
  });

  mcp.on('close', (code) => {
    log(`[MCP] Process exited with code ${code}`);
    server.close();
    process.exit(code);
  });

  // 終了処理
  process.on('SIGINT', () => {
    log('[PROXY] Shutting down...');
    mcp.kill();
    server.close();
    process.exit();
  });
});