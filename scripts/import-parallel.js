/**
 * 並列処理で全年度のStorageファイルをインポート
 * 高速化版
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

const BATCH_SIZE = 500; // 並列処理用に増やす
const PARALLEL_LIMIT = 10; // 並列処理数

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
  
  // パターン2: FY20XX/企業ID/... の形式
  if (!companyId && parts.length > 1) {
    const potentialId = parts[1];
    if (potentialId && potentialId.match(/^[S][0-9]{4}/i)) {
      companyId = potentialId.toUpperCase();
    }
  }
  
  // パターン3: by_company/企業ID_日付 の形式
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
    metadata.document_type = fullPath.includes('audit') ? 'AuditDoc' : 'PublicDoc';
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
 * 特定のプレフィックスのファイルを取得
 */
async function getFilesForPrefix(prefix) {
  const files = [];
  let hasMore = true;
  let offset = 0;
  
  while (hasMore) {
    try {
      const { data, error } = await supabase.storage
        .from('markdown-files')
        .list(prefix, {
          limit: 1000,
          offset: offset
        });
      
      if (error) {
        console.error(`❌ エラー (${prefix}):`, error.message);
        hasMore = false;
        break;
      }
      
      if (data && data.length > 0) {
        // .mdファイルのみフィルタ
        const mdFiles = data.filter(f => f.name.endsWith('.md'));
        mdFiles.forEach(file => {
          files.push({
            ...file,
            fullPath: `${prefix}/${file.name}`
          });
        });
        
        // 次のページがあるか確認
        if (data.length < 1000) {
          hasMore = false;
        } else {
          offset += 1000;
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`❌ 取得エラー (${prefix}):`, error.message);
      hasMore = false;
    }
  }
  
  return files;
}

/**
 * バッチ処理でデータベースに投入
 */
async function insertBatch(batch) {
  if (batch.length === 0) return;
  
  try {
    // 有効なデータのみフィルタ
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
    }
  } catch (error) {
    console.error(`  ❌ バッチ処理エラー:`, error.message);
    stats.errors += batch.length;
  }
}

/**
 * 並列処理で年度のファイルを処理
 */
async function processYearParallel(year) {
  console.log(`\n📅 FY${year} 処理開始...`);
  
  // 年度のトップレベルディレクトリを取得
  const { data: topDirs, error } = await supabase.storage
    .from('markdown-files')
    .list(`FY${year}`, { limit: 1000 });
  
  if (error) {
    console.error(`❌ FY${year} エラー:`, error.message);
    return;
  }
  
  if (!topDirs || topDirs.length === 0) {
    console.log(`  ⚠️ FY${year} にファイルがありません`);
    return;
  }
  
  // ディレクトリのみフィルタ
  const directories = topDirs.filter(item => !item.name.includes('.'));
  console.log(`  📁 ${directories.length}個のディレクトリを発見`);
  
  // 並列処理でファイルを取得
  const allFiles = [];
  for (let i = 0; i < directories.length; i += PARALLEL_LIMIT) {
    const batch = directories.slice(i, i + PARALLEL_LIMIT);
    const promises = batch.map(dir => {
      const dirPath = `FY${year}/${dir.name}`;
      
      // FY2016の場合はサブディレクトリ（AuditDoc/PublicDoc）も処理
      if (year === 2016) {
        return Promise.all([
          getFilesForPrefix(`${dirPath}/AuditDoc`),
          getFilesForPrefix(`${dirPath}/PublicDoc`)
        ]).then(results => results.flat());
      } else {
        return getFilesForPrefix(dirPath);
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(files => allFiles.push(...files));
    
    console.log(`  📊 進捗: ${Math.min(i + PARALLEL_LIMIT, directories.length)}/${directories.length} ディレクトリ処理済み`);
  }
  
  console.log(`  ✅ ${allFiles.length}個のMarkdownファイルを発見`);
  stats.totalFiles += allFiles.length;
  
  // メタデータ抽出と投入
  const metadata = allFiles.map(file => extractMetadata(file));
  
  // バッチごとに投入
  for (let i = 0; i < metadata.length; i += BATCH_SIZE) {
    const batch = metadata.slice(i, i + BATCH_SIZE);
    await insertBatch(batch);
    stats.processedFiles += batch.length;
    
    const progress = Math.round((i + batch.length) / metadata.length * 100);
    console.log(`  💾 投入進捗: ${progress}% (${i + batch.length}/${metadata.length})`);
  }
  
  console.log(`  ✅ FY${year} 完了: ${allFiles.length}ファイル処理`);
}

/**
 * メイン処理
 */
async function main() {
  console.log('========================================');
  console.log('📁 並列処理版 全年度Storageインポート');
  console.log('========================================');
  console.log(`📡 接続先: ${SUPABASE_URL}`);
  console.log(`⚙️ バッチサイズ: ${BATCH_SIZE}`);
  console.log(`🚀 並列処理数: ${PARALLEL_LIMIT}`);
  console.log('');
  
  // 既存データの確認
  const { count: existingCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 既存レコード数: ${existingCount || 0}`);
  
  // 既存のfile_pathを取得
  console.log('📋 既存データを取得中...');
  const existingPaths = new Set();
  let offset = 0;
  while (true) {
    const { data: existing } = await supabase
      .from('markdown_files_metadata')
      .select('file_path')
      .range(offset, offset + 9999);
    
    if (!existing || existing.length === 0) break;
    
    existing.forEach(item => existingPaths.add(item.file_path));
    offset += 10000;
  }
  
  console.log(`✅ ${existingPaths.size}件の既存パスを取得`);
  console.log('');
  
  // 年度ごとに処理（FY2015〜FY2025）
  const years = [];
  for (let year = 2015; year <= 2025; year++) {
    years.push(year);
  }
  
  for (const year of years) {
    await processYearParallel(year);
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