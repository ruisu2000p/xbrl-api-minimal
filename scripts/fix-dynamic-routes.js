/**
 * すべてのAPIルートに動的レンダリング設定を追加
 */

const fs = require('fs');
const path = require('path');

// APIルートディレクトリ
const apiDir = path.join(__dirname, '..', 'app', 'api');

// 動的レンダリング設定
const dynamicExport = `// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

`;

// すべてのroute.tsファイルを再帰的に検索
function findRouteFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (item === 'route.ts' || item === 'route.tsx') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// ファイルを修正
function fixRouteFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // すでに設定がある場合はスキップ
  if (content.includes("export const dynamic") || content.includes("export const runtime")) {
    console.log(`  ✓ Already fixed: ${path.relative(apiDir, filePath)}`);
    return false;
  }
  
  // import文の前に追加（ファイルの先頭）
  content = dynamicExport + content;
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ Fixed: ${path.relative(apiDir, filePath)}`);
  return true;
}

// メイン処理
console.log('🔧 Fixing dynamic routes...\n');

const routeFiles = findRouteFiles(apiDir);
console.log(`Found ${routeFiles.length} route files\n`);

let fixedCount = 0;
for (const file of routeFiles) {
  if (fixRouteFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);
console.log(`✓ ${routeFiles.length - fixedCount} files already had dynamic configuration`);