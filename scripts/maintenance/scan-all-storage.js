/**
 * 全Storage Markdownファイルのメタデータをスキャン・投入
 * バッチ処理で大量データに対応
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 統計情報
let stats = {
  totalFiles: 0,
  processedFiles: 0,
  insertedFiles: 0,
  skippedFiles: 0,
  errors: 0,
  startTime: Date.now()
};

// バッチサイズ
const BATCH_SIZE = 100;
let currentBatch = [];

/**
 * Storage内のすべてのファイルを再帰的に取得
 */
async function getAllStorageFiles(prefix = '', allFiles = []) {
  try {
    console.log(`📂 スキャン中: ${prefix || 'root'}`);
    
    const { data: files, error } = await supabase.storage
      .from('markdown-files')
      .list(prefix, {
        limit: 1000,
        offset: 0
      });

    if (error) {
      console.error('❌ Storage list error:', error.message);
      return allFiles;
    }

    if (files && files.length > 0) {
      for (const file of files) {
        const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
        
        if (file.metadata?.mimetype || file.name.endsWith('.md')) {
          // ファイルの場合
          allFiles.push({
            ...file,
            fullPath: fullPath
          });
          stats.totalFiles++;
          
          // 進捗表示
          if (stats.totalFiles % 100 === 0) {
            console.log(`  📊 ${stats.totalFiles}ファイル検出...`);
          }
        } else if (!file.name.includes('.')) {
          // ディレクトリの場合、再帰的にスキャン
          await getAllStorageFiles(fullPath, allFiles);
        }
      }
    }
  } catch (error) {
    console.error(`❌ スキャンエラー (${prefix}):`, error.message);
    stats.errors++;
  }
  
  return allFiles;
}

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
  
  // FY2015形式: FY2015/by_company/{company_id}_{dates}_{hash}/*.md
  if (fullPath.startsWith('FY2015/by_company/')) {
    metadata.fiscal_year = 2015;
    const companyFolder = parts[2];
    if (companyFolder) {
      const companyMatch = companyFolder.match(/^([A-Z0-9]+)_/);
      if (companyMatch) {
        metadata.company_id = companyMatch[1];
      }
    }
    metadata.document_type = 'PublicDoc';
  }
  // FY2016形式: FY2016/{company_id}/{AuditDoc|PublicDoc}/*.md
  else if (fullPath.startsWith('FY2016/')) {
    metadata.fiscal_year = 2016;
    metadata.company_id = parts[1];
    metadata.document_type = parts[2] || 'PublicDoc';
  }
  // その他の形式
  else {
    // 年度をパスから推測
    const yearMatch = fullPath.match(/FY(\d{4})/i);
    if (yearMatch) {
      metadata.fiscal_year = parseInt(yearMatch[1]);
    }
    
    // 企業IDをパスから推測
    const idMatch = fullPath.match(/([A-Z]\d{4}[A-Z0-9]{3,4})/);
    if (idMatch) {
      metadata.company_id = idMatch[1];
    }
    
    // ドキュメントタイプを推測
    if (fullPath.includes('Audit')) {
      metadata.document_type = 'AuditDoc';
    } else if (fullPath.includes('Public')) {
      metadata.document_type = 'PublicDoc';
    }
  }
  
  // セクションタイプを推測
  const sectionMatch = file.name.match(/^(\d{7})_/);
  if (sectionMatch) {
    const sectionCode = sectionMatch[1];
    if (sectionCode === '0000000') metadata.section_type = 'header';
    else if (sectionCode.startsWith('0101')) metadata.section_type = 'company_overview';
    else if (sectionCode.startsWith('0102')) metadata.section_type = 'business_overview';
    else if (sectionCode.startsWith('0103')) metadata.section_type = 'business_risks';
    else if (sectionCode.startsWith('0104')) metadata.section_type = 'management_analysis';
    else if (sectionCode.startsWith('0105')) metadata.section_type = 'corporate_governance';
    else if (sectionCode.startsWith('0106')) metadata.section_type = 'consolidated_financial';
    else if (sectionCode.startsWith('0107')) metadata.section_type = 'audit_report';
    else metadata.section_type = `section_${sectionCode}`;
    
    metadata.file_order = parseInt(sectionCode);
  }
  
  return metadata;
}

/**
 * バッチ処理でデータベースに投入
 */
async function insertBatch(batch) {
  if (batch.length === 0) return;
  
  try {
    console.log(`  💾 ${batch.length}件のデータを投入中...`);
    
    const { data, error } = await supabase
      .from('markdown_files_metadata')
      .upsert(batch, {
        onConflict: 'file_path',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`  ❌ 投入エラー:`, error.message);
      stats.errors += batch.length;
    } else {
      stats.insertedFiles += batch.length;
      console.log(`  ✅ ${batch.length}件投入完了`);
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
  console.log('📁 Storage全ファイルメタデータスキャン開始');
  console.log('========================================');
  console.log(`📡 接続先: ${SUPABASE_URL}`);
  console.log(`⚙️  バッチサイズ: ${BATCH_SIZE}`);
  console.log('');
  
  // 既存データの確認
  const { count: existingCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 既存レコード数: ${existingCount || 0}`);
  console.log('');
  
  // Storage全体をスキャン
  console.log('🔍 Storageスキャン開始...');
  const allFiles = await getAllStorageFiles();
  
  console.log(`\n✅ スキャン完了: ${allFiles.length}ファイル検出`);
  console.log('');
  
  // メタデータ抽出と投入
  console.log('📝 メタデータ処理開始...');
  
  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    
    // .mdファイルのみ処理
    if (!file.name.endsWith('.md')) {
      stats.skippedFiles++;
      continue;
    }
    
    // メタデータ抽出
    const metadata = extractMetadata(file);
    currentBatch.push(metadata);
    stats.processedFiles++;
    
    // バッチが満杯になったら投入
    if (currentBatch.length >= BATCH_SIZE) {
      await insertBatch(currentBatch);
      currentBatch = [];
      
      // 進捗表示
      const progress = Math.round((stats.processedFiles / allFiles.length) * 100);
      console.log(`📊 進捗: ${progress}% (${stats.processedFiles}/${allFiles.length})`);
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
  console.log(`⏭️  スキップ: ${stats.skippedFiles}`);
  console.log(`❌ エラー: ${stats.errors}`);
  console.log(`⏱️  処理時間: ${elapsedTime}秒`);
  
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
      console.log(`  FY${year}: ${count}ファイル`);
    });
  }
  
  console.log('\n✅ 全処理完了！');
}

// 実行
main().catch(error => {
  console.error('❌ 致命的エラー:', error.message);
  process.exit(1);
});