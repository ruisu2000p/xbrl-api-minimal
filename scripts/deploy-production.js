#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🚀 Production Deployment Script\n');
console.log('================================\n');

// 1. 環境チェック
console.log('1. Checking environment...');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars.join(', '));
  console.log('\nPlease set these in Vercel Dashboard:');
  console.log('Settings → Environment Variables\n');
  process.exit(1);
}

console.log('✅ Environment variables configured\n');

// 2. 本番用コードに切り替え
console.log('2. Switching to production code...');

const routePath = path.join(projectRoot, 'app/api/v1/companies/route.ts');
const prodRoutePath = path.join(projectRoot, 'app/api/v1/companies/route.prod.ts');

if (fs.existsSync(prodRoutePath)) {
  // バックアップ作成
  const backupPath = routePath + '.backup';
  fs.copyFileSync(routePath, backupPath);
  console.log(`   Backup created: ${backupPath}`);
  
  // 本番用コードに置き換え
  fs.copyFileSync(prodRoutePath, routePath);
  console.log('✅ Production code activated\n');
} else {
  console.log('⚠️  Production code file not found, using current code\n');
}

// 3. ビルドテスト
console.log('3. Running build test...');
try {
  execSync('npm run build', { 
    cwd: projectRoot,
    stdio: 'inherit'
  });
  console.log('✅ Build successful\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// 4. Git操作
console.log('4. Preparing Git deployment...');

try {
  // 変更をコミット
  execSync('git add -A', { cwd: projectRoot });
  execSync(`git commit -m "chore: Deploy to production - ${new Date().toISOString()}"`, { 
    cwd: projectRoot 
  });
  console.log('✅ Changes committed\n');
  
  // タグ作成
  const version = `v1.0.${Date.now()}`;
  execSync(`git tag -a ${version} -m "Production release ${version}"`, { 
    cwd: projectRoot 
  });
  console.log(`✅ Tagged as ${version}\n`);
  
  // プッシュ
  console.log('5. Pushing to GitHub...');
  execSync('git push origin main --tags', { cwd: projectRoot });
  console.log('✅ Pushed to GitHub\n');
  
} catch (error) {
  if (error.message.includes('nothing to commit')) {
    console.log('ℹ️  No changes to commit\n');
  } else {
    console.error('⚠️  Git operation warning:', error.message);
  }
}

// 5. デプロイ確認
console.log('6. Deployment status:\n');
console.log('   🌐 Vercel will automatically deploy from GitHub');
console.log('   ⏱️  Deployment usually takes 1-2 minutes');
console.log('   📊 Monitor at: https://vercel.com/dashboard\n');

// 6. ヘルスチェック
console.log('7. Post-deployment checklist:\n');
console.log('   [ ] Check deployment logs in Vercel Dashboard');
console.log('   [ ] Test API endpoint: https://xbrl-api-minimal.vercel.app/api/v1/companies');
console.log('   [ ] Verify database connection (4,225 companies)');
console.log('   [ ] Test rate limiting');
console.log('   [ ] Check API key validation');
console.log('   [ ] Monitor error logs\n');

console.log('================================');
console.log('✅ Production deployment initiated!');
console.log('================================\n');