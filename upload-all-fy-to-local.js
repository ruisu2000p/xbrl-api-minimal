const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Supabase local configuration
const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey);

// XBRLデータのベースパス
const BASE_PATH = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発';
const FY_YEARS = ['FY2022', 'FY2023', 'FY2024', 'FY2025'];

// ディレクトリ名をハッシュ化
function hashDirectoryName(dirName) {
  return crypto.createHash('md5').update(dirName).digest('hex');
}

// プログレス表示
function displayProgress(current, total, message) {
  const percentage = Math.round((current / total) * 100);

  // Simple console log for progress (Windows compatible)
  if (current % 10 === 0 || current === total) {
    console.log(`   [${percentage}%] ${current}/${total} - ${message}`);
  }
}

async function uploadMarkdownFiles() {
  const summary = {
    totalFiles: 0,
    uploadedFiles: 0,
    skippedFiles: 0,
    failedFiles: [],
    byYear: {}
  };

  console.log('🚀 Starting bulk upload to local Supabase...');
  console.log('📍 Target: http://localhost:54321\n');

  for (const fy of FY_YEARS) {
    const fyPath = path.join(BASE_PATH, fy);

    if (!fs.existsSync(fyPath)) {
      console.log(`⚠️  Directory not found: ${fy}`);
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 Processing ${fy}...`);

    const companies = fs.readdirSync(fyPath).filter(dir =>
      fs.statSync(path.join(fyPath, dir)).isDirectory()
    );

    console.log(`   Found ${companies.length} companies`);

    summary.byYear[fy] = {
      companies: 0,
      files: 0,
      uploaded: 0,
      failed: 0
    };

    let companyCount = 0;

    for (const companyDir of companies) {
      companyCount++;
      const companyPath = path.join(fyPath, companyDir);

      // Company IDを抽出 (最初の8文字)
      const companyId = companyDir.substring(0, 8);
      const hashedDir = hashDirectoryName(companyDir);
      const companyName = companyDir.substring(9, Math.min(companyDir.indexOf('_', 9), 50));

      displayProgress(companyCount, companies.length,
        `${companyId} - ${companyName || 'Processing'}...`);

      summary.byYear[fy].companies++;

      // PublicDoc_markdownとAuditDoc_markdownをチェック
      const docTypes = ['PublicDoc_markdown', 'AuditDoc_markdown'];

      for (const docType of docTypes) {
        const docPath = path.join(companyPath, docType);

        if (!fs.existsSync(docPath)) {
          continue;
        }

        const files = fs.readdirSync(docPath);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        summary.byYear[fy].files += mdFiles.length;
        summary.totalFiles += mdFiles.length;

        for (const file of mdFiles) {
          const filePath = path.join(docPath, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');

          // Storage pathを構築
          const storagePath = `${fy}/${hashedDir}/${docType}/${file}`;

          try {
            // 既存ファイルをチェック
            const { data: existingFile, error: checkError } = await supabase.storage
              .from('markdown-files')
              .list(`${fy}/${hashedDir}/${docType}`, {
                limit: 1000,
                search: file
              });

            if (!checkError && existingFile && existingFile.some(f => f.name === file)) {
              summary.skippedFiles++;
              continue; // 既に存在する場合はスキップ
            }

            // ファイルをアップロード
            const { data, error } = await supabase.storage
              .from('markdown-files')
              .upload(storagePath, fileContent, {
                contentType: 'text/markdown',
                upsert: false
              });

            if (error) throw error;

            summary.uploadedFiles++;
            summary.byYear[fy].uploaded++;

          } catch (error) {
            if (error.message && error.message.includes('duplicate')) {
              summary.skippedFiles++;
            } else {
              summary.byYear[fy].failed++;
              summary.failedFiles.push({
                file: storagePath,
                error: error.message
              });
            }
          }

          // レート制限対策
          if (summary.uploadedFiles % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }

    console.log(`\n✅ ${fy} completed!`);
    console.log(`   Companies: ${summary.byYear[fy].companies}`);
    console.log(`   Files: ${summary.byYear[fy].files}`);
    console.log(`   Uploaded: ${summary.byYear[fy].uploaded}`);
    console.log(`   Failed: ${summary.byYear[fy].failed}`);
  }

  // 最終サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL UPLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📈 Overall Statistics:`);
  console.log(`  Total files processed: ${summary.totalFiles}`);
  console.log(`  Successfully uploaded: ${summary.uploadedFiles}`);
  console.log(`  Skipped (already exists): ${summary.skippedFiles}`);
  console.log(`  Failed uploads: ${summary.failedFiles.length}`);

  console.log(`\n📅 By Year:`);
  for (const fy of FY_YEARS) {
    if (summary.byYear[fy]) {
      const yearData = summary.byYear[fy];
      console.log(`  ${fy}:`);
      console.log(`    Companies: ${yearData.companies}`);
      console.log(`    Files: ${yearData.files}`);
      console.log(`    Uploaded: ${yearData.uploaded}`);
      if (yearData.failed > 0) {
        console.log(`    Failed: ${yearData.failed}`);
      }
    }
  }

  if (summary.failedFiles.length > 0) {
    console.log('\n❌ Failed files (first 10):');
    summary.failedFiles.slice(0, 10).forEach(f => {
      console.log(`  - ${f.file}`);
      console.log(`    Error: ${f.error}`);
    });

    // 失敗したファイルをJSONファイルに保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const failedFilePath = `upload_failed_${timestamp}.json`;
    fs.writeFileSync(failedFilePath, JSON.stringify(summary.failedFiles, null, 2));
    console.log(`\n📝 Failed files saved to: ${failedFilePath}`);
  }

  // ストレージの最終確認
  console.log('\n📦 Verifying final storage state...');
  for (const fy of FY_YEARS) {
    const { data: yearData, error } = await supabase.storage
      .from('markdown-files')
      .list(fy);

    if (!error && yearData) {
      console.log(`  ${fy}: ${yearData.length} company directories`);
    }
  }

  console.log('\n✨ Upload process completed!');
}

// 実行
uploadMarkdownFiles().catch(console.error);