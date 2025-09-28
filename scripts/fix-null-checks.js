#!/usr/bin/env node

/**
 * TypeScript null check修正スクリプト
 * Service clientやSupabase clientのnullチェックを自動的に追加
 */

const fs = require('fs');
const path = require('path');

// 修正が必要なファイルのリスト
const filesToFix = [
  'app/api/v1/companies/route.ts',
  'app/api/v1/companies/secure-route.ts',
  'app/api/v1/documents/route.ts',
  'app/api/v1/security/metrics/route.ts',
  'lib/infrastructure/health-check.ts',
  'lib/infrastructure/rate-limiter.ts',
  'lib/middleware/rate-limit-enhanced.ts',
  'lib/middleware/rate-limit.ts',
  'lib/monitoring/redirect-monitor.ts',
  'lib/security/auth-manager.ts',
  'lib/security/csrf.ts',
  'lib/security/security-monitor.ts'
];

// パターンと置換のマッピング
const replacements = [
  {
    // serviceClientのnullチェック
    pattern: /const serviceClient = supabaseManager\.getServiceClient\(\);(\r?\n)/g,
    replacement: `const serviceClient = supabaseManager.getServiceClient();$1    if (!serviceClient) {$1      return NextResponse.json($1        { error: 'Service client not available' },$1        { status: 500 }$1      );$1    }$1`
  },
  {
    // supabaseのnullチェック (getServiceClient)
    pattern: /const supabase = supabaseManager\.getServiceClient\(\);(\r?\n)(?!.*if \(!supabase\))/g,
    replacement: `const supabase = supabaseManager.getServiceClient();$1    if (!supabase) {$1      throw new Error('Service client not available');$1    }$1`
  },
  {
    // createTemporaryAdminClientのnullチェック
    pattern: /const client = supabaseManager\.createTemporaryAdminClient\(\);(\r?\n)(?!.*if \(!client\))/g,
    replacement: `const client = supabaseManager.createTemporaryAdminClient();$1    if (!client) {$1      throw new Error('Admin client not available');$1    }$1`
  }
];

// 各ファイルを処理
filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  replacements.forEach(({pattern, replacement}) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  // auth-manager.ts特有の修正
  if (filePath.includes('auth-manager.ts')) {
    content = content.replace(
      /this\.supabase\s*=\s*supabaseManager\.getServiceClient\(\);/g,
      `const client = supabaseManager.getServiceClient();
    if (!client) {
      throw new Error('Service client not available');
    }
    this.supabase = client;`
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
});

console.log('\n✨ Null check fixes completed!');