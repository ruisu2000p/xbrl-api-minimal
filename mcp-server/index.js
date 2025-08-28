#!/usr/bin/env node

/**
 * XBRL MCP Server - Main Entry Point
 * 引数に応じて適切なモードで起動
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

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

// スクリプトの存在確認
if (!existsSync(scriptPath)) {
  console.error(`[ERROR] Script not found: ${scriptPath}`);
  console.error('[INFO] Please ensure all files are properly installed');
  process.exit(1);
}

// 選択されたスクリプトを実行
const child = spawn(process.execPath, [scriptPath], {
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