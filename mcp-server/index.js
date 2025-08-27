#!/usr/bin/env node

/**
 * XBRL MCP Server - Main Entry Point
 * 引数に応じて適切なモードで起動
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// コマンドライン引数を解析
const args = process.argv.slice(2);
const mode = args[0];

let scriptPath;

// モードに応じてスクリプトを選択
switch (mode) {
  case '--remote':
  case '-r':
    console.error('[INFO] Starting in REMOTE mode (for mobile apps)...');
    scriptPath = join(__dirname, 'index-remote.js');
    break;
    
  case '--secure':
  case '-s':
    console.error('[INFO] Starting in SECURE mode (with authentication)...');
    scriptPath = join(__dirname, 'index-secure.js');
    break;
    
  case '--api':
  case '-a':
  default:
    console.error('[INFO] Starting in API mode (standard)...');
    scriptPath = join(__dirname, 'index-api.js');
    break;
}

// 選択されたスクリプトを実行
const child = spawn('node', [scriptPath], {
  stdio: 'inherit',
  env: process.env
});

// エラーハンドリング
child.on('error', (error) => {
  console.error('[FATAL] Failed to start MCP server:', error);
  process.exit(1);
});

// 子プロセスの終了を待つ
child.on('exit', (code) => {
  process.exit(code || 0);
});