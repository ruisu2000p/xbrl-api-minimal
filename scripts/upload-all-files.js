require('dotenv').config({ path: '.env.local' });
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 処理範囲の設定
const START_INDEX = parseInt(process.env.START_INDEX || '100'); // 101社目から開始
const END_INDEX = parseInt(process.env.END_INDEX || '4231'); // 全社まで
const BATCH_SIZE = 5;

// カウンター
let processedCompanies = 0;
let uploadedFiles = 0;
let errorCount = 0;
const errors = [];

async function main() {
  const baseDir = 'C:/Users/pumpk/OneDrive/デスクトップ/アプリ開発/2021_4_1から2022_3_31有価証券報告書Markdown/all_markdown_output_2021_2022';
  
  console.log('===========================================');
  console.log('全Markdownファイル アップロードスクリプト');
  console.log('===========================================');
  console.log('ソースディレクトリ:', baseDir);
  console.log('');
  
  try {
    const companies = await fs.readdir(baseDir);
    const targetCompanies = companies.slice(START_INDEX, Math.min(END_INDEX, companies.length));
    
    console.log(`📁 ${companies.length}社のデータを検出しました`);
    console.log(`処理範囲: ${START_INDEX + 1}社目 〜 ${Math.min(END_INDEX, companies.length)}社目`);
    console.log('');
    
    // バッチ処理
    for (let i = 0; i < targetCompanies.length; i += BATCH_SIZE) {
      const batch = targetCompanies.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`バッチ ${batchNum}: ${START_INDEX + i + 1}〜${START_INDEX + i + batch.length}社目を処理中...`);
      
      await Promise.all(
        batch.map(companyDir => processCompany(companyDir, baseDir))
      );
      
      console.log(`✅ 進捗: ${processedCompanies}社/${targetCompanies.length}社, ${uploadedFiles}ファイル処理済み`);
    }
    
    // 完了レポート
    console.log('');
    console.log('===========================================');
    console.log('アップロード完了');
    console.log('===========================================');
    console.log(`✅ 処理企業数: ${processedCompanies}社`);
    console.log(`📁 アップロードファイル数: ${uploadedFiles}ファイル`);
    console.log(`❌ エラー: ${errorCount}件`);
    
    if (errors.length > 0) {
      console.log('\nエラー詳細:');
      errors.forEach(err => {
        console.log(`  - ${err.company}: ${err.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ スクリプトエラー:', error.message);
    console.error(error.stack);
  }
}

async function processCompany(companyDir, baseDir) {
  const companyPath = path.join(baseDir, companyDir);
  
  try {
    const stats = await fs.stat(companyPath);
    
    if (!stats.isDirectory()) {
      return;
    }
    
    // ディレクトリ名から企業IDを抽出
    const companyIdMatch = companyDir.match(/^([A-Z0-9]+)/i);
    const companyId = companyIdMatch ? companyIdMatch[1] : companyDir.replace(/[^A-Za-z0-9]/g, '_');
    
    // PublicDoc_markdownディレクトリを探す
    const publicDocPath = path.join(companyPath, 'PublicDoc_markdown');
    let docPath = publicDocPath;
    let docCategory = 'public';
    
    try {
      await fs.access(publicDocPath);
    } catch {
      // PublicDocがない場合はAuditDocを試す
      const auditDocPath = path.join(companyPath, 'AuditDoc_markdown');
      try {
        await fs.access(auditDocPath);
        docPath = auditDocPath;
        docCategory = 'audit';
      } catch {
        throw new Error('Markdownディレクトリが見つかりません');
      }
    }
    
    // すべてのMarkdownファイルをアップロード
    await uploadAllMarkdownFiles(companyId, docPath, docCategory, companyDir);
    
    processedCompanies++;
    
  } catch (error) {
    errorCount++;
    errors.push({
      company: companyDir,
      message: error.message
    });
  }
}

async function uploadAllMarkdownFiles(companyId, docPath, docCategory, originalDirName) {
  const files = await fs.readdir(docPath);
  const mdFiles = files.filter(f => f.endsWith('.md')).sort();
  
  if (mdFiles.length === 0) {
    throw new Error('Markdownファイルが見つかりません');
  }
  
  console.log(`  📂 ${originalDirName}: ${mdFiles.length}ファイル検出`);
  
  // 最初のファイルから年度を抽出
  const firstContent = await fs.readFile(
    path.join(docPath, mdFiles[0]),
    'utf-8'
  );
  const fiscalYear = extractFiscalYear(firstContent);
  
  // 既存のファイルをチェック
  const { data: existingFiles } = await supabase.storage
    .from('markdown-files')
    .list(`${fiscalYear}/${companyId}`, { limit: 100 });
  
  const existingFileNames = new Set((existingFiles || []).map(f => f.name));
  
  // 各ファイルをアップロード
  let uploadCount = 0;
  for (const mdFile of mdFiles) {
    try {
      // ファイル名をクリーンアップ
      const cleanFileName = mdFile.replace(/[^A-Za-z0-9._-]/g, '_');
      
      // 既にアップロード済みの場合はスキップ
      if (existingFileNames.has(cleanFileName)) {
        console.log(`    ⏭️ スキップ: ${mdFile} (既存)`);
        continue;
      }
      
      const content = await fs.readFile(
        path.join(docPath, mdFile),
        'utf-8'
      );
      
      // ストレージパス
      const storagePath = `${fiscalYear}/${companyId}/${cleanFileName}`;
      
      // アップロード
      const { error: uploadError } = await supabase.storage
        .from('markdown-files')
        .upload(storagePath, content, {
          contentType: 'text/markdown; charset=utf-8',
          upsert: true
        });
      
      if (uploadError) {
        console.log(`    ❌ エラー: ${mdFile}: ${uploadError.message}`);
      } else {
        uploadCount++;
        uploadedFiles++;
      }
      
    } catch (error) {
      console.log(`    ❌ ${mdFile}: ${error.message}`);
    }
  }
  
  if (uploadCount > 0) {
    console.log(`    ✅ ${uploadCount}ファイルを新規アップロード`);
  }
}

// 年度を抽出
function extractFiscalYear(content) {
  const patterns = [
    /(\d{4})年3月期/,
    /令和(\d+)年.*3月31日/,
    /平成(\d+)年.*3月31日/,
    /(\d{4})年.*3月31日/,
    /第\d+期.*(\d{4})年/
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      if (pattern.source.includes('令和')) {
        return 2018 + parseInt(match[1]);
      } else if (pattern.source.includes('平成')) {
        return 1988 + parseInt(match[1]);
      } else if (match[1] && match[1].length === 4) {
        return parseInt(match[1]);
      }
    }
  }
  
  return 2022; // デフォルト
}

// 実行
main();