const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Supabase local configuration
const supabaseUrl = process.env.SUPABASE_LOCAL_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_LOCAL_SERVICE_KEY environment variable is required');
  console.log('Please set it using:');
  console.log('export SUPABASE_LOCAL_SERVICE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// XBRLデータのベースパス
const BASE_PATH = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発';
const FY_YEARS = ['FY2024']; // まずFY2024から始める

// ディレクトリ名をハッシュ化
function hashDirectoryName(dirName) {
  return crypto.createHash('md5').update(dirName).digest('hex');
}

async function uploadMarkdownFiles() {
  let totalFiles = 0;
  let uploadedFiles = 0;
  let failedFiles = [];

  for (const fy of FY_YEARS) {
    const fyPath = path.join(BASE_PATH, fy);

    if (!fs.existsSync(fyPath)) {
      console.log(`⚠️  Directory not found: ${fyPath}`);
      continue;
    }

    console.log(`\n📁 Processing ${fy}...`);
    const companies = fs.readdirSync(fyPath);

    // 最初の3社だけテスト
    const testCompanies = companies.slice(0, 3);

    for (const companyDir of testCompanies) {
      const companyPath = path.join(fyPath, companyDir);

      if (!fs.statSync(companyPath).isDirectory()) continue;

      // Company IDを抽出 (最初の8文字)
      const companyId = companyDir.substring(0, 8);
      const hashedDir = hashDirectoryName(companyDir);

      console.log(`\n  🏢 Processing ${companyId} (${companyDir.substring(9, 40)}...)`);

      // PublicDoc_markdownとAuditDoc_markdownをチェック
      const docTypes = ['PublicDoc_markdown', 'AuditDoc_markdown'];

      for (const docType of docTypes) {
        const docPath = path.join(companyPath, docType);

        if (!fs.existsSync(docPath)) {
          console.log(`    ⚠️  ${docType} not found`);
          continue;
        }

        const files = fs.readdirSync(docPath);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        console.log(`    📄 Found ${mdFiles.length} files in ${docType}`);

        // 最初の3ファイルだけテスト
        const testFiles = mdFiles.slice(0, 3);

        for (const file of testFiles) {
          const filePath = path.join(docPath, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');

          // Storage pathを構築
          const storagePath = `${fy}/${hashedDir}/${docType}/${file}`;

          totalFiles++;

          try {
            // ファイルをアップロード
            const { data, error } = await supabase.storage
              .from('markdown-files')
              .upload(storagePath, fileContent, {
                contentType: 'text/markdown',
                upsert: true
              });

            if (error) throw error;

            uploadedFiles++;
            console.log(`      ✅ ${file}`);
          } catch (error) {
            console.error(`      ❌ Failed: ${file} - ${error.message}`);
            failedFiles.push({
              file: storagePath,
              error: error.message
            });
          }

          // レート制限対策
          if (uploadedFiles % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary:');
  console.log(`  Total files processed: ${totalFiles}`);
  console.log(`  Successfully uploaded: ${uploadedFiles}`);
  console.log(`  Failed uploads: ${failedFiles.length}`);

  if (failedFiles.length > 0) {
    console.log('\n❌ Failed files:');
    failedFiles.forEach(f => console.log(`  - ${f.file}: ${f.error}`));
  }

  // ストレージの内容を確認
  console.log('\n📦 Verifying storage contents...');
  const { data: listData, error: listError } = await supabase.storage
    .from('markdown-files')
    .list('FY2024', { limit: 10 });

  if (listError) {
    console.error('Failed to list files:', listError);
  } else {
    console.log(`Found ${listData.length} items in FY2024 directory`);
    listData.slice(0, 5).forEach(item => {
      console.log(`  - ${item.name}`);
    });
  }
}

// 実行
console.log('🚀 Starting local to Supabase upload...');
console.log('📍 Target: Local Supabase (http://localhost:54321)');
uploadMarkdownFiles().catch(console.error);