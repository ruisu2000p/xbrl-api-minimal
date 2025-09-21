#!/usr/bin/env node

// 環境変数を直接設定してMCPサーバーのコードを実行
process.env.SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';
process.env.XBRL_API_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway';
process.env.XBRL_API_KEY = 'fin_live_4aa1e0700fd449f0a539d92f325b09aa';

console.error('[Direct Runner] Environment variables set:');
console.error(`  SUPABASE_URL: ${process.env.SUPABASE_URL}`);
console.error(`  XBRL_API_URL: ${process.env.XBRL_API_URL}`);
console.error(`  XBRL_API_KEY: ${process.env.XBRL_API_KEY.substring(0, 10)}...`);
console.error(`  SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY.substring(0, 10)}...`);

// MCPサーバーを直接require/importして実行
console.error('[Direct Runner] Loading MCP server...');

// npxでダウンロードされたパッケージを直接実行
const path = require('path');
const { execSync } = require('child_process');

try {
  // まずnpxでパッケージを確実にダウンロード
  console.error('[Direct Runner] Ensuring package is installed...');
  execSync('npx --yes shared-supabase-mcp-minimal@latest --version', {
    stdio: 'ignore',
    env: process.env
  });

  // パッケージのパスを探す
  const packagePath = execSync('npm root -g', { encoding: 'utf8' }).trim();
  console.error(`[Direct Runner] Package path: ${packagePath}`);

  // MCPサーバーのエントリポイントを直接実行
  require('shared-supabase-mcp-minimal');
} catch (error) {
  // フォールバック: npxキャッシュから直接実行
  console.error('[Direct Runner] Trying cached version...');
  const cachePath = path.join(
    process.env.LOCALAPPDATA || process.env.HOME,
    'npm-cache',
    '_npx'
  );

  // 最新のキャッシュディレクトリを探す
  const fs = require('fs');
  const cacheDir = fs.readdirSync(cachePath)
    .filter(dir => fs.existsSync(path.join(cachePath, dir, 'node_modules', 'shared-supabase-mcp-minimal')))
    .sort()
    .pop();

  if (cacheDir) {
    const mcpPath = path.join(cachePath, cacheDir, 'node_modules', 'shared-supabase-mcp-minimal', 'index.js');
    console.error(`[Direct Runner] Loading from: ${mcpPath}`);

    // ESモジュールなのでdynamic importを使用
    (async () => {
      try {
        await import(`file:///${mcpPath.replace(/\\/g, '/')}`);
      } catch (importError) {
        console.error('[Direct Runner] Import error:', importError.message);
        process.exit(1);
      }
    })();
  } else {
    console.error('[Direct Runner] Could not find MCP server package');
    process.exit(1);
  }
}