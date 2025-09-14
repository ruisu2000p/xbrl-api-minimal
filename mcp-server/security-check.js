#!/usr/bin/env node

/**
 * セキュリティチェックスクリプト
 * 旧バージョンから新バージョンへの移行状況を確認
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 Security Check for shared-supabase-mcp-minimal\n');
console.log('=' .repeat(50));

// チェック項目
const checks = {
  oldVersion: false,
  newVersion: false,
  envVars: false,
  hardcodedKeys: false,
  configFile: false
};

// 1. ファイルの存在確認
console.log('\n📁 File Check:');
if (fs.existsSync(path.join(__dirname, 'index.js'))) {
  console.log('  ✓ index.js (v1.x) found');
  checks.oldVersion = true;
}
if (fs.existsSync(path.join(__dirname, 'index-secure.js'))) {
  console.log('  ✓ index-secure.js (v2.0) found');
  checks.newVersion = true;
}

// 2. ハードコードされたキーのチェック
console.log('\n🔍 Checking for hardcoded keys:');
if (checks.oldVersion) {
  const oldContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  if (oldContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
    console.log('  ⚠️  WARNING: Hardcoded keys found in index.js');
    console.log('     This is a security risk! Please migrate to v2.0');
    checks.hardcodedKeys = true;
  } else {
    console.log('  ✓ No hardcoded keys in index.js');
  }
}

// 3. 環境変数のチェック
console.log('\n🔐 Environment Variables:');
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const alternativeEnvVars = ['XBRL_SUPABASE_URL', 'XBRL_ANON_KEY'];

let hasRequired = true;
let hasAlternative = true;

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`  ✓ ${envVar} is set`);
  } else {
    console.log(`  ✗ ${envVar} is not set`);
    hasRequired = false;
  }
});

if (!hasRequired) {
  console.log('\n  Checking alternative variables:');
  alternativeEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`  ✓ ${envVar} is set`);
    } else {
      console.log(`  ✗ ${envVar} is not set`);
      hasAlternative = false;
    }
  });
}

checks.envVars = hasRequired || hasAlternative;

// 4. 設定ファイルのチェック
console.log('\n📝 Configuration Files:');
if (fs.existsSync(path.join(__dirname, '.env'))) {
  console.log('  ✓ .env file exists');
  checks.configFile = true;
} else if (fs.existsSync(path.join(__dirname, '.env.example'))) {
  console.log('  ℹ️  .env.example found (copy to .env and configure)');
} else {
  console.log('  ✗ No configuration files found');
}

// 5. セキュリティ推奨事項
console.log('\n' + '=' .repeat(50));
console.log('📊 Security Assessment:\n');

if (checks.hardcodedKeys) {
  console.log('🔴 CRITICAL: Hardcoded keys detected!');
  console.log('   Action Required:');
  console.log('   1. Generate new keys in Supabase Dashboard');
  console.log('   2. Migrate to index-secure.js');
  console.log('   3. Invalidate old keys');
} else if (!checks.envVars && checks.newVersion) {
  console.log('🟠 WARNING: Environment variables not configured');
  console.log('   Action Required:');
  console.log('   1. Set SUPABASE_URL and SUPABASE_ANON_KEY');
  console.log('   2. See SECURITY_MIGRATION_GUIDE.md for details');
} else if (checks.envVars && checks.newVersion) {
  console.log('🟢 SECURE: Using environment-based configuration');
  console.log('   Good job! Your setup is secure.');
} else {
  console.log('🟡 INFO: Please complete the migration to v2.0');
}

// 6. 次のステップ
console.log('\n📋 Next Steps:');
if (checks.hardcodedKeys || !checks.newVersion) {
  console.log('1. Read SECURITY_MIGRATION_GUIDE.md');
  console.log('2. Set up environment variables');
  console.log('3. Test with: node index-secure.js --healthcheck');
  console.log('4. Update Claude Desktop configuration');
} else if (!checks.envVars) {
  console.log('1. Copy .env.example to .env');
  console.log('2. Add your Supabase credentials');
  console.log('3. Test with: node index-secure.js --healthcheck');
} else {
  console.log('✅ Your setup is complete and secure!');
  console.log('   Remember to rotate keys periodically.');
}

console.log('\n' + '=' .repeat(50));

// Exit with appropriate code
if (checks.hardcodedKeys) {
  process.exit(1); // Critical security issue
} else if (!checks.envVars && checks.newVersion) {
  process.exit(2); // Configuration needed
} else {
  process.exit(0); // All good
}