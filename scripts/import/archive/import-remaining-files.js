/**
 * 残りのファイル（年度フォルダ以外）をインポート
 * ルートレベルの企業IDフォルダを直接スキャン
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
 * ファイルパスからメタデータを抽出（改良版）
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
  
  // 年度を抽出（複数パターン対応）
  // パターン1: FY2021形式
  const yearMatch = fullPath.match(/FY(\d{4})/i);
  if (yearMatch) {
    metadata.fiscal_year = parseInt(yearMatch[1]);
  }
  // パターン2: ファイル名から年度を推測（2014_02_01_2015_01_31形式）
  else if (fullPath.includes('2020') || fullPath.includes('2021') || fullPath.includes('2022')) {
    const yearMatches = fullPath.match(/20(\d{2})/g);
    if (yearMatches && yearMatches.length > 0) {
      // 最後の年を使用（決算年度）
      const lastYear = yearMatches[yearMatches.length - 1];
      metadata.fiscal_year = parseInt('20' + lastYear.substring(2));
    }
  }
  // パターン3: ファイル名に含まれる日付から推測
  else {
    const dateMatch = file.name.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
    if (dateMatch) {
      metadata.fiscal_year = parseInt(dateMatch[1]);
    }
  }
  
  // 企業IDを抽出（複数パターン対応）
  let companyId = null;
  
  // パターン1: 標準的な企業ID（S + 数字 + 英数字）
  const idMatch = fullPath.match(/([S][0-9]{4}[A-Z0-9]{2,4})/i);
  if (idMatch) {
    companyId = idMatch[1].toUpperCase();
  }
  
  // パターン2: 最初のディレクトリが企業ID
  if (!companyId && parts.length > 0) {
    const firstDir = parts[0];
    if (firstDir && firstDir.match(/^[S][0-9]{4}/i)) {
      companyId = firstDir.split('_')[0].toUpperCase();
    }
  }
  
  // パターン3: ファイル名から抽出
  if (!companyId) {
    const fileMatch = file.name.match(/([S][0-9]{4}[A-Z0-9]{2,4})/i);
    if (fileMatch) {
      companyId = fileMatch[1].toUpperCase();
    }
  }
  
  // パターン4: フォルダ名から抽出（S100XXX_企業名形式）
  if (!companyId) {
    for (const part of parts) {
      const match = part.match(/^([S][0-9]{4}[A-Z0-9]*)/i);
      if (match) {
        companyId = match[1].toUpperCase();
        break;
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
  
  // ドキュメントタイプを判定
  if (fullPath.includes('AuditDoc')) {
    metadata.document_type = 'AuditDoc';
  } else if (fullPath.includes('PublicDoc')) {
    metadata.document_type = 'PublicDoc';
  } else {
    // デフォルトはPublicDoc
    metadata.document_type = 'PublicDoc';
  }
  
  // セクションタイプを推測
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
 * 全ファイルを再帰的に取得（改良版）
 * FY20XX以外のファイルも含める
 */
async function getAllRemainingFiles(prefix = '', allFiles = [], depth = 0, processedDirs = new Set()) {
  // 循環参照を防ぐ
  if (processedDirs.has(prefix)) {
    return allFiles;
  }
  processedDirs.add(prefix);
  
  // 深さ制限
  if (depth > 10) {
    console.log(`  ⚠️ 深さ制限に達しました: ${prefix}`);
    return allFiles;
  }
  
  try {
    if (depth <= 2) {  // 最初の2階層のみログ出力
      console.log(`${'  '.repeat(depth)}📂 スキャン中: ${prefix || 'root'}`);
    }
    
    const { data: files, error } = await supabase.storage
      .from('markdown-files')
      .list(prefix, {
        limit: 1000,
        offset: 0
      });

    if (error) {
      console.error(`❌ Storage list error (${prefix}):`, error.message);
      stats.errors++;
      return allFiles;
    }

    if (files && files.length > 0) {
      for (const file of files) {
        const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
        
        // FY20XXフォルダはスキップ（既に処理済み）
        if (file.name.match(/^FY20\d{2}$/)) {
          console.log(`  ⏭️ スキップ: ${file.name} (既に処理済み)`);
          continue;
        }
        
        // .mdファイルの場合
        if (file.name.endsWith('.md')) {
          allFiles.push({
            ...file,
            fullPath: fullPath
          });
          stats.totalFiles++;
          
          // 進捗表示
          if (stats.totalFiles % 1000 === 0) {
            console.log(`  📊 ${stats.totalFiles}ファイル検出...`);
          }
        }
        // ディレクトリの場合
        else if (!file.name.includes('.')) {
          // 再帰的にスキャン
          await getAllRemainingFiles(fullPath, allFiles, depth + 1, processedDirs);
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
 * バッチ処理でデータベースに投入
 */
async function insertBatch(batch) {
  if (batch.length === 0) return;
  
  try {
    console.log(`  💾 ${batch.length}件のデータを投入中...`);
    
    // 有効なデータのみフィルタ
    const validBatch = batch.filter(item => 
      item.company_id && 
      item.file_path && 
      item.company_id !== null
    );
    
    if (validBatch.length === 0) {
      console.log(`  ⚠️ 有効なデータがありません`);
      stats.skippedFiles += batch.length;
      return;
    }
    
    const { data, error } = await supabase
      .from('markdown_files_metadata')
      .upsert(validBatch, {
        onConflict: 'file_path',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`  ❌ 投入エラー:`, error.message);
      // エラーの詳細を表示
      if (error.details) {
        console.error(`  詳細:`, error.details);
      }
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
  console.log('📁 残りのStorageファイルインポート');
  console.log('========================================');
  console.log(`📡 接続先: ${SUPABASE_URL}`);
  console.log(`⚙️ バッチサイズ: ${BATCH_SIZE}`);
  console.log('');
  
  // 既存データの確認
  const { count: existingCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 既存レコード数: ${existingCount || 0}`);
  
  // 既存のfile_pathを取得（重複チェック用）
  console.log('📋 既存データを取得中...');
  const existingPaths = new Set();
  let offset = 0;
  const limit = 10000;
  
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
    
    if (existingFiles.length < limit) break;
    offset += limit;
  }
  
  console.log(`✅ ${existingPaths.size}件の既存パスを取得`);
  console.log('');
  
  // Storage全体をスキャン（FY20XXフォルダ以外）
  console.log('🔍 残りのファイルをスキャン開始...');
  console.log('  （FY20XXフォルダはスキップします）');
  const allFiles = await getAllRemainingFiles();
  
  console.log(`\n✅ スキャン完了: ${allFiles.length}ファイル検出`);
  
  // 新規ファイルのみフィルタ
  const newFiles = allFiles.filter(file => !existingPaths.has(file.fullPath));
  console.log(`🆕 新規ファイル: ${newFiles.length}件`);
  console.log(`⏭️ スキップ（既存）: ${allFiles.length - newFiles.length}件`);
  stats.skippedFiles += (allFiles.length - newFiles.length);
  console.log('');
  
  if (newFiles.length === 0) {
    console.log('✅ 処理対象の新規ファイルはありません');
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
      console.log(`  FY${year}: ${count}ファイル`);
    });
  }
  
  // 企業ID統計
  const { data: companyStats } = await supabase
    .from('markdown_files_metadata')
    .select('company_id');
  
  if (companyStats) {
    const uniqueCompanies = new Set(companyStats.map(c => c.company_id));
    const unknownCount = companyStats.filter(c => c.company_id.startsWith('UNKNOWN')).length;
    
    console.log(`\n🏢 企業統計:`);
    console.log(`  ユニーク企業数: ${uniqueCompanies.size}`);
    console.log(`  正常な企業ID: ${uniqueCompanies.size - Array.from(uniqueCompanies).filter(id => id.startsWith('UNKNOWN')).length}`);
    console.log(`  不明な企業ID: ${unknownCount}件`);
  }
  
  console.log('\n✅ 全処理完了！');
}

// 実行
main().catch(error => {
  console.error('❌ 致命的エラー:', error.message);
  process.exit(1);
});