#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Remove unnecessary null checks from API routes since getServiceClient always returns SupabaseClient
const filesToClean = [
  'app/api/v1/companies/route.ts',
  'app/api/v1/documents/route.ts',
  'app/api/v1/security/metrics/route.ts',
  'app/api/auth/issue-api-key/route.ts'
];

filesToClean.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Remove unnecessary null checks for serviceClient
  content = content.replace(
    /const serviceClient = supabaseManager\.getServiceClient\(\)(\r?\n)\s+if \(!serviceClient\) \{[\s\S]*?\}(\r?\n)/g,
    'const serviceClient = supabaseManager.getServiceClient()$1'
  );

  // Remove unnecessary null checks for supabaseAdmin
  content = content.replace(
    /const supabaseAdmin = supabaseManager\.createTemporaryAdminClient\(\);(\r?\n)\s+if \(!supabaseAdmin\) \{[\s\S]*?\}(\r?\n)/g,
    'const supabaseAdmin = supabaseManager.createTemporaryAdminClient();$1'
  );

  if (content !== fs.readFileSync(fullPath, 'utf8')) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Cleaned: ${filePath}`);
    modified = true;
  }

  if (!modified) {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
});

// Remove NextResponse from library files
const libraryFiles = [
  'lib/monitoring/redirect-monitor.ts',
  'lib/security/security-monitor.ts'
];

libraryFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Remove NextResponse import
  content = content.replace(/import \{ NextResponse \} from 'next\/server';\r?\n/g, '');
  content = content.replace(/import \{[^}]*NextResponse[^}]*\} from 'next\/server';\r?\n/g, (match) => {
    // Keep other imports if any
    const otherImports = match.replace(/,?\s*NextResponse\s*,?/g, '').replace(/\{\s*\}/g, '{}');
    return otherImports.includes('{}') ? '' : otherImports;
  });

  // Replace NextResponse.json with console.error or throw
  content = content.replace(
    /return NextResponse\.json\([^)]+\);?/g,
    'console.error(\'Service client not available\');\n      return;'
  );

  fs.writeFileSync(fullPath, content);
  console.log(`✅ Fixed library file: ${filePath}`);
});

console.log('\n✨ Cleanup completed!');