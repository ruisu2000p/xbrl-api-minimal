/**
 * 既存データ取得の修正版
 * FY2015のby_companyフォルダを再スキャン
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 100;
let stats = {
  totalFiles: 0,
  processedFiles: 0,
  insertedFiles: 0,
  skippedFiles: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * ファイルパスからメタデータを抽出
 */
function extractMetadata(file) {
  const fullPath = file.fullPath;
  const parts = fullPath.split('/');
  
  let metadata = {
    file_path: fullPath,
    storage_path: `markdown-files/${fullPath}`,
    file_name: file.name,
    file_size: file.metadata?.size || 0,
    indexed_at: new Date().toISOString()
  };
  
  // 年度を抽出
  const yearMatch = fullPath.match(/FY(\d{4})/i);
  if (yearMatch) {
    metadata.fiscal_year = parseInt(yearMatch[1]);
  }
  
  // 企業IDを抽出（複数パターン対応）
  let companyId = null;
  
  // パターン1: 標準的な企業ID
  const idMatch = fullPath.match(/([S][0-9]{4}[A-Z0-9]{2,4})/i);
  if (idMatch) {
    companyId = idMatch[1].toUpperCase();
  }
  
  // パターン2: by_company/企業ID_日付 の形式
  if (!companyId && fullPath.includes('by_company/')) {
    const companyFolderIndex = parts.indexOf('by_company') + 1;
    if (companyFolderIndex < parts.length) {
      const folderName = parts[companyFolderIndex];
      const match = folderName.match(/^([S][0-9]{4}[A-Z0-9]*)/i);
      if (match) {
        companyId = match[1].toUpperCase();
      }
    }
  }
  
  // パターン3: FY20XX/企業ID/... の形式
  if (!companyId && parts.length > 1) {
    const potentialId = parts[1];
    if (potentialId && potentialId.match(/^[S][0-9]{4}/i)) {
      companyId = potentialId.toUpperCase();
    }
  }
  
  // 見つからない場合はフォールバック
  if (!companyId) {
    const year = metadata.fiscal_year || 'XXXX';
    const hash = fullPath.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    companyId = `UNKNOWN_${year}_${Math.abs(hash).toString(36).substring(0, 6).toUpperCase()}`;
  }
  
  metadata.company_id = companyId;
  
  // ドキュメントタイプ
  if (fullPath.includes('AuditDoc')) {
    metadata.document_type = 'AuditDoc';
  } else if (fullPath.includes('PublicDoc')) {
    metadata.document_type = 'PublicDoc';
  } else {
    metadata.document_type = 'PublicDoc';
  }
  
  // セクションタイプ
  const sectionMatch = file.name.match(/^(\d{7})_/);
  if (sectionMatch) {
    const sectionCode = sectionMatch[1];
    metadata.file_order = parseInt(sectionCode);
    
    if (sectionCode === '0000000') metadata.section_type = 'header';
    else if (sectionCode.startsWith('0101')) metadata.section_type = 'company_overview';
    else if (sectionCode.startsWith('0102')) metadata.section_type = 'business_overview';
    else if (sectionCode.startsWith('0103')) metadata.section_type = 'business_risks';
    else if (sectionCode.startsWith('0104')) metadata.section_type = 'management_analysis';
    else if (sectionCode.startsWith('0105')) metadata.section_type = 'corporate_governance';
    else if (sectionCode.startsWith('0106')) metadata.section_type = 'consolidated_financial';
    else if (sectionCode.startsWith('0107')) metadata.section_type = 'audit_report';
    else metadata.section_type = `section_${sectionCode}`;
  } else {
    metadata.section_type = 'other';
    metadata.file_order = 9999999;
  }
  
  return metadata;
}

/**
 * FY2015/by_companyをスキャン
 */
async function scanFY2015() {
  console.log('📂 FY2015/by_companyをスキャン中...');
  
  const allFiles = [];
  
  // by_company内のディレクトリを取得
  const { data: companies, error } = await supabase.storage
    .from('markdown-files')
    .list('FY2015/by_company', { limit: 1000 });
  
  if (error) {
    console.error('❌ エラー:', error.message);
    return allFiles;
  }
  
  const directories = companies.filter(item => !item.name.includes('.'));
  console.log(`  📁 ${directories.length}個の企業フォルダを発見`);
  
  // 各企業フォルダ内のファイルを取得
  for (const dir of directories) {
    const path = `FY2015/by_company/${dir.name}`;
    
    const { data: files, error: fileError } = await supabase.storage
      .from('markdown-files')
      .list(path, { limit: 100 });
    
    if (fileError) {
      console.error(`  ❌ エラー (${dir.name}):`, fileError.message);
      continue;
    }
    
    if (files) {
      const mdFiles = files.filter(f => f.name.endsWith('.md'));
      mdFiles.forEach(file => {
        allFiles.push({
          ...file,
          fullPath: `${path}/${file.name}`
        });
      });
    }
  }
  
  console.log(`  ✅ ${allFiles.length}個のMarkdownファイルを発見`);
  return allFiles;
}

/**
 * バッチ処理でデータベースに投入
 */
async function insertBatch(batch) {
  if (batch.length === 0) return;
  
  try {
    const validBatch = batch.filter(item => 
      item.company_id && 
      item.file_path && 
      item.company_id !== null
    );
    
    if (validBatch.length === 0) {
      stats.skippedFiles += batch.length;
      return;
    }
    
    const { error } = await supabase
      .from('markdown_files_metadata')
      .upsert(validBatch, {
        onConflict: 'file_path',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`  ❌ 投入エラー:`, error.message);
      stats.errors += validBatch.length;
    } else {
      stats.insertedFiles += validBatch.length;
      stats.skippedFiles += (batch.length - validBatch.length);
      console.log(`  ✅ ${validBatch.length}件投入完了`);
    }
  } catch (error) {
    console.error(`  ❌ バッチ処理エラー:`, error.message);
    stats.errors += batch.length;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('========================================');
  console.log('📁 FY2015完全再スキャン');
  console.log('========================================');
  console.log(`📡 接続先: ${SUPABASE_URL}`);
  console.log('');
  
  // 既存データの確認
  const { count: existingCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 既存レコード数: ${existingCount || 0}`);
  
  // 既存のfile_pathを完全に取得
  console.log('📋 既存データを完全取得中...');
  const existingPaths = new Set();
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data: existingFiles, error } = await supabase
      .from('markdown_files_metadata')
      .select('file_path')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('❌ 既存データ取得エラー:', error.message);
      break;
    }
    
    if (!existingFiles || existingFiles.length === 0) break;
    
    existingFiles.forEach(f => existingPaths.add(f.file_path));
    console.log(`  ${existingPaths.size}件取得...`);
    
    if (existingFiles.length < limit) break;
    offset += limit;
  }
  
  console.log(`✅ ${existingPaths.size}件の既存パスを取得完了`);
  console.log('');
  
  // FY2015/by_companyをスキャン
  const fy2015Files = await scanFY2015();
  stats.totalFiles = fy2015Files.length;
  
  // 新規ファイルのみフィルタ
  const newFiles = fy2015Files.filter(file => !existingPaths.has(file.fullPath));
  console.log(`🆕 新規ファイル: ${newFiles.length}件`);
  console.log(`⏭️ スキップ（既存）: ${fy2015Files.length - newFiles.length}件`);
  stats.skippedFiles += (fy2015Files.length - newFiles.length);
  console.log('');
  
  if (newFiles.length === 0) {
    console.log('✅ 処理対象の新規ファイルはありません');
    
    // 年度別統計を表示
    const { data: yearStats } = await supabase
      .from('markdown_files_metadata')
      .select('fiscal_year')
      .not('fiscal_year', 'is', null);
    
    if (yearStats) {
      const years = {};
      yearStats.forEach(row => {
        years[row.fiscal_year] = (years[row.fiscal_year] || 0) + 1;
      });
      
      console.log('\n📅 現在の年度別ファイル数:');
      Object.entries(years).sort().forEach(([year, count]) => {
        console.log(`  FY${year}: ${count.toLocaleString()}ファイル`);
      });
    }
    
    return;
  }
  
  // メタデータ抽出と投入
  console.log('📝 メタデータ処理開始...');
  
  let currentBatch = [];
  
  for (let i = 0; i < newFiles.length; i++) {
    const file = newFiles[i];
    
    // メタデータ抽出
    const metadata = extractMetadata(file);
    currentBatch.push(metadata);
    stats.processedFiles++;
    
    // バッチが満杯になったら投入
    if (currentBatch.length >= BATCH_SIZE) {
      await insertBatch(currentBatch);
      currentBatch = [];
      
      // 進捗表示
      const progress = Math.round((stats.processedFiles / newFiles.length) * 100);
      console.log(`📊 進捗: ${progress}% (${stats.processedFiles}/${newFiles.length})`);
    }
  }
  
  // 残りのバッチを投入
  if (currentBatch.length > 0) {
    await insertBatch(currentBatch);
  }
  
  // 最終統計
  const elapsedTime = Math.round((Date.now() - stats.startTime) / 1000);
  
  console.log('\n========================================');
  console.log('📊 処理完了統計');
  console.log('========================================');
  console.log(`✅ 総ファイル数: ${stats.totalFiles}`);
  console.log(`📝 処理済み: ${stats.processedFiles}`);
  console.log(`💾 投入済み: ${stats.insertedFiles}`);
  console.log(`⏭️ スキップ: ${stats.skippedFiles}`);
  console.log(`❌ エラー: ${stats.errors}`);
  console.log(`⏱️ 処理時間: ${elapsedTime}秒`);
  
  // データベースの最終確認
  const { count: finalCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📈 最終レコード数: ${finalCount || 0}`);
  console.log(`   (増加: +${(finalCount || 0) - (existingCount || 0)})`);
  
  // 年度別統計
  const { data: yearStats } = await supabase
    .from('markdown_files_metadata')
    .select('fiscal_year')
    .not('fiscal_year', 'is', null);
  
  if (yearStats) {
    const years = {};
    yearStats.forEach(row => {
      years[row.fiscal_year] = (years[row.fiscal_year] || 0) + 1;
    });
    
    console.log('\n📅 年度別ファイル数:');
    Object.entries(years).sort().forEach(([year, count]) => {
      console.log(`  FY${year}: ${count.toLocaleString()}ファイル`);
    });
  }
  
  console.log('\n✅ 全処理完了！');
}

// 実行
main().catch(error => {
  console.error('❌ 致命的エラー:', error.message);
  process.exit(1);
});