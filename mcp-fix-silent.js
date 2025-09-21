#!/usr/bin/env node

// MCP URL修正プロキシ（サイレント版）- shared-supabase-mcp-minimalのバグを回避
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

  // 環境変数設定（プロキシ経由）
  process.env.SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';
  process.env.XBRL_API_URL = `http://localhost:${PROXY_PORT}`;  // プロキシ経由
  process.env.XBRL_API_KEY = 'fin_live_4aa1e0700fd449f0a539d92f325b09aa';

  log('[PROXY] Starting MCP server with fixed URL...');
  log(`[PROXY] Log file: ${LOG_FILE}`);

  // MCPサーバー起動（stdioをそのまま継承）
  const mcp = spawn('npx', ['shared-supabase-mcp-minimal@latest'], {
    env: process.env,
    stdio: 'inherit',  // stdin, stdout, stderrをそのまま継承
    shell: true
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