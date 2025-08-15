require('dotenv').config({ path: '.env.local' });
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = 5;
let fixedCount = 0;
let totalFiles = 0;
let errorCount = 0;

async function main() {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  console.log('===========================================');
  console.log('不完全アップロード修正スクリプト');
  console.log('===========================================');
  console.log('');
  
  try {
    // 2022フォルダの1ファイルのみの企業を特定
    const { data: dirs } = await supabase.storage
      .from('markdown-files')
      .list('2022', { limit: 10000 });
    
    const incompleteCompanies = [];
    
    console.log('📋 チェック中...');
    for (const dir of dirs || []) {
      const { data: files } = await supabase.storage
        .from('markdown-files')
        .list(`2022/${dir.name}`, { limit: 2 });
      
      if (files?.length === 1) {
        incompleteCompanies.push(dir.name);
      }
    }
    
    console.log(`🔍 ${incompleteCompanies.length}社が1ファイルのみ`);
    console.log('');
    
    // ローカルディレクトリから企業を探して修正
    const allCompanies = await fs.readdir(baseDir);
    
    for (let i = 0; i < incompleteCompanies.length; i += BATCH_SIZE) {
      const batch = incompleteCompanies.slice(i, i + BATCH_SIZE);
      
      console.log(`バッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${i + 1}〜${Math.min(i + BATCH_SIZE, incompleteCompanies.length)}社目を処理中...`);
      
      await Promise.all(
        batch.map(companyId => fixCompany(companyId, allCompanies, baseDir))
      );
      
      console.log(`✅ 進捗: ${Math.min(i + BATCH_SIZE, incompleteCompanies.length)}/${incompleteCompanies.length}社`);
    }
    
    // 完了レポート
    console.log('');
    console.log('===========================================');
    console.log('修正完了');
    console.log('===========================================');
    console.log(`✅ 修正企業数: ${fixedCount}社`);
    console.log(`📁 アップロードファイル数: ${totalFiles}ファイル`);
    console.log(`❌ エラー: ${errorCount}件`);
    
  } catch (error) {
    console.error('❌ スクリプトエラー:', error.message);
    console.error(error.stack);
  }
}

async function fixCompany(companyId, allCompanies, baseDir) {
  try {
    // ディレクトリ名を探す
    const companyDir = allCompanies.find(dir => dir.startsWith(companyId));
    
    if (!companyDir) {
      console.log(`  ⚠️ ${companyId}: ローカルディレクトリが見つかりません`);
      return;
    }
    
    const companyPath = path.join(baseDir, companyDir);
    
    // PublicDoc_markdownディレクトリを探す
    const publicDocPath = path.join(companyPath, 'PublicDoc_markdown');
    let docPath = publicDocPath;
    
    try {
      await fs.access(publicDocPath);
    } catch {
      // PublicDocがない場合はAuditDocを試す
      const auditDocPath = path.join(companyPath, 'AuditDoc_markdown');
      try {
        await fs.access(auditDocPath);
        docPath = auditDocPath;
      } catch {
        console.log(`  ⚠️ ${companyId}: Markdownディレクトリが見つかりません`);
        return;
      }
    }
    
    // すべてのMarkdownファイルをアップロード
    await uploadAllFiles(companyId, docPath);
    
    fixedCount++;
    
  } catch (error) {
    errorCount++;
    console.log(`  ❌ ${companyId}: ${error.message}`);
  }
}

async function uploadAllFiles(companyId, docPath) {
  const files = await fs.readdir(docPath);
  const mdFiles = files.filter(f => f.endsWith('.md')).sort();
  
  if (mdFiles.length <= 1) {
    console.log(`  ⏭️ ${companyId}: ${mdFiles.length}ファイルのみ（スキップ）`);
    return;
  }
  
  console.log(`  📂 ${companyId}: ${mdFiles.length}ファイル検出`);
  
  // 既存ファイルを削除（1ファイルのみなので）
  const { data: existingFiles } = await supabase.storage
    .from('markdown-files')
    .list(`2022/${companyId}`, { limit: 10 });
  
  if (existingFiles?.length) {
    for (const file of existingFiles) {
      await supabase.storage
        .from('markdown-files')
        .remove([`2022/${companyId}/${file.name}`]);
    }
  }
  
  // 年度を判定（2021年度）
  const fiscalYear = 2021;
  
  // 各ファイルをアップロード
  let uploadCount = 0;
  for (const mdFile of mdFiles) {
    try {
      const content = await fs.readFile(
        path.join(docPath, mdFile),
        'utf-8'
      );
      
      // ファイル名をクリーンアップ
      const cleanFileName = mdFile.replace(/[^A-Za-z0-9._-]/g, '_');
      
      // ストレージパス
      const storagePath = `${fiscalYear}/${companyId}/${cleanFileName}`;
      
      // アップロード
      const { error: uploadError } = await supabase.storage
        .from('markdown-files')
        .upload(storagePath, content, {
          contentType: 'text/markdown; charset=utf-8',
          upsert: true
        });
      
      if (!uploadError) {
        uploadCount++;
        totalFiles++;
      }
      
    } catch (error) {
      console.log(`    ❌ ${mdFile}: ${error.message}`);
    }
  }
  
  console.log(`    ✅ ${uploadCount}ファイルをアップロード`);
}

// 実行
main();