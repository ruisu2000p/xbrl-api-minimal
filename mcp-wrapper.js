#!/usr/bin/env node

// MCP Wrapper - URLのスペースバグを修正してGatewayにプロキシ
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

// 環境変数を設定
process.env.SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

// ローカルプロキシサーバーを起動
const proxyPort = 8888;
const server = http.createServer((req, res) => {
  // URLのスペースを修正
  const fixedPath = req.url.replace(/gateway\s+\//g, 'gateway/').replace(/gateway%20\//g, 'gateway/');

  const options = {
    hostname: 'wpwqxhyiglbtlaimrjrx.supabase.co',
    port: 443,
    path: '/functions/v1' + fixedPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'wpwqxhyiglbtlaimrjrx.supabase.co'
    }
  };

  console.error(`[PROXY] ${req.method} ${req.url} -> ${options.path}`);

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[PROXY ERROR]', err);
    res.writeHead(500);
    res.end('Proxy Error');
  });

  req.pipe(proxyReq);
});

server.listen(proxyPort, () => {
  console.error(`[PROXY] Listening on port ${proxyPort}`);

  // MCPサーバーを起動（ローカルプロキシを使用）
  process.env.XBRL_API_URL = `http://localhost:${proxyPort}/gateway`;
  process.env.XBRL_API_KEY = 'fin_live_4aa1e0700fd449f0a539d92f325b09aa';

  const mcp = spawn('npx', ['shared-supabase-mcp-minimal@latest'], {
    env: process.env,
    stdio: 'inherit'
  });

  mcp.on('close', (code) => {
    server.close();
    process.exit(code);
  });

  process.on('SIGINT', () => {
    mcp.kill();
    server.close();
    process.exit();
  });
});