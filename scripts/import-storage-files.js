/**
 * Storageファイルを効率的にインポート
 * 処理を分割して実行
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

// 処理するバッチサイズ
const BATCH_SIZE = 50;
const FOLDERS_PER_RUN = 100; // 一度に処理するフォルダ数

let stats = {
  totalFolders: 0,
  processedFiles: 0,
  insertedFiles: 0,
  errors: 0
};

/**
 * フォルダリストを取得
 */
async function getFolders(prefix, limit = FOLDERS_PER_RUN) {
  const { data: items, error } = await supabase.storage
    .from('markdown-files')
    .list(prefix, { limit: 1000 });
  
  if (error) {
    console.error('❌ Storage list error:', error.message);
    return [];
  }

  // フォルダのみフィルタ
  const folders = items
    .filter(item => !item.name.includes('.') && item.metadata?.mimetype === undefined)
    .slice(0, limit);
  
  return folders.map(f => prefix ? `${prefix}/${f.name}` : f.name);
}

/**
 * フォルダ内のMarkdownファイルを処理
 */
async function processFolder(folderPath) {
  console.log(`📂 処理中: ${folderPath}`);
  
  const { data: files, error } = await supabase.storage
    .from('markdown-files')
    .list(folderPath, { limit: 1000 });
  
  if (error) {
    console.error(`  ❌ エラー: ${error.message}`);
    stats.errors++;
    return;
  }

  const mdFiles = files.filter(f => f.name.endsWith('.md'));
  
  if (mdFiles.length === 0) {
    // サブフォルダをチェック
    const subfolders = files.filter(f => !f.name.includes('.'));
    for (const subfolder of subfolders) {
      await processFolder(`${folderPath}/${subfolder.name}`);
    }
    return;
  }

  const batch = [];
  
  for (const file of mdFiles) {
    const fullPath = `${folderPath}/${file.name}`;
    const metadata = extractMetadata(fullPath, file);
    batch.push(metadata);
    stats.processedFiles++;
    
    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch.splice(0, BATCH_SIZE));
    }
  }
  
  // 残りを投入
  if (batch.length > 0) {
    await insertBatch(batch);
  }
}

/**
 * メタデータ抽出
 */
function extractMetadata(fullPath, file) {
  const parts = fullPath.split('/');
  
  let metadata = {
    file_path: fullPath,
    storage_path: `markdown-files/${fullPath}`,
    file_name: file.name,
    file_size: file.metadata?.size || 0,
    indexed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // FY2015形式
  if (fullPath.startsWith('FY2015/by_company/')) {
    metadata.fiscal_year = 2015;
    const companyFolder = parts[2];
    if (companyFolder) {
      const match = companyFolder.match(/^([A-Z0-9]+)_/);
      if (match) metadata.company_id = match[1];
    }
    metadata.document_type = 'PublicDoc';
  }
  // FY2016形式
  else if (fullPath.startsWith('FY2016/')) {
    metadata.fiscal_year = 2016;
    metadata.company_id = parts[1];
    metadata.document_type = parts[2] || 'PublicDoc';
  }
  
  // セクションタイプ
  const sectionMatch = file.name.match(/^(\d{7})_/);
  if (sectionMatch) {
    const code = sectionMatch[1];
    metadata.file_order = parseInt(code);
    
    if (code === '0000000') metadata.section_type = 'header';
    else if (code.startsWith('0101')) metadata.section_type = 'company_overview';
    else if (code.startsWith('0102')) metadata.section_type = 'business_overview';
    else if (code.startsWith('0103')) metadata.section_type = 'business_risks';
    else if (code.startsWith('0104')) metadata.section_type = 'management_analysis';
    else if (code.startsWith('0105')) metadata.section_type = 'corporate_governance';
    else metadata.section_type = `section_${code}`;
  }
  
  return metadata;
}

/**
 * バッチ投入
 */
async function insertBatch(batch) {
  if (batch.length === 0) return;
  
  console.log(`  💾 ${batch.length}件投入中...`);
  
  const { error } = await supabase
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
}

/**
 * メイン処理
 */
async function main() {
  console.log('========================================');
  console.log('📁 Storageファイルインポート開始');
  console.log('========================================');
  console.log(`⚙️  バッチサイズ: ${BATCH_SIZE}`);
  console.log(`📂 処理フォルダ数: ${FOLDERS_PER_RUN}`);
  console.log('');
  
  // 既存データ確認
  const { count: existing } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 既存レコード: ${existing || 0}`);
  console.log('');
  
  // FY2015処理
  console.log('🔍 FY2015処理開始...');
  const fy2015Folders = await getFolders('FY2015/by_company');
  
  for (const folder of fy2015Folders) {
    await processFolder(folder);
    stats.totalFolders++;
    
    // 進捗表示
    if (stats.totalFolders % 10 === 0) {
      console.log(`\n📊 進捗: ${stats.totalFolders}フォルダ処理済み, ${stats.insertedFiles}ファイル投入済み\n`);
    }
  }
  
  // FY2016処理
  console.log('\n🔍 FY2016処理開始...');
  const fy2016Folders = await getFolders('FY2016');
  
  for (const folder of fy2016Folders) {
    await processFolder(folder);
    stats.totalFolders++;
    
    // 進捗表示
    if (stats.totalFolders % 10 === 0) {
      console.log(`\n📊 進捗: ${stats.totalFolders}フォルダ処理済み, ${stats.insertedFiles}ファイル投入済み\n`);
    }
  }
  
  // 最終統計
  const { count: final } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n========================================');
  console.log('📊 処理完了統計');
  console.log('========================================');
  console.log(`📂 処理フォルダ数: ${stats.totalFolders}`);
  console.log(`📝 処理ファイル数: ${stats.processedFiles}`);
  console.log(`💾 投入ファイル数: ${stats.insertedFiles}`);
  console.log(`❌ エラー数: ${stats.errors}`);
  console.log(`\n📈 最終レコード数: ${final || 0} (+${(final || 0) - (existing || 0)})`);
  
  // 年度別確認
  const { data: yearData } = await supabase
    .from('markdown_files_metadata')
    .select('fiscal_year')
    .not('fiscal_year', 'is', null);
  
  if (yearData) {
    const years = {};
    yearData.forEach(r => {
      years[r.fiscal_year] = (years[r.fiscal_year] || 0) + 1;
    });
    
    console.log('\n📅 年度別:');
    Object.entries(years).sort().forEach(([y, c]) => {
      console.log(`  FY${y}: ${c}ファイル`);
    });
  }
  
  console.log('\n✅ 処理完了！');
  
  if (stats.processedFiles < 1000) {
    console.log('\n💡 ヒント: より多くのファイルを処理するには、FOLDERS_PER_RUNを増やしてください');
  }
}

// 実行
main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});