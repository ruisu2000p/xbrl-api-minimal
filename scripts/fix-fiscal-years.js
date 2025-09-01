/**
 * fiscal_yearがNULLまたは不正なレコードを修正
 * file_pathから年度を抽出して更新
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

const BATCH_SIZE = 500;

/**
 * file_pathから年度を抽出
 */
function extractYearFromPath(filePath) {
  // パターン1: FY2017形式
  const fyMatch = filePath.match(/FY(\d{4})/i);
  if (fyMatch) {
    return parseInt(fyMatch[1]);
  }
  
  // パターン2: S100XXX形式の企業IDから推測（先頭の文字列から）
  // FY2021: S100NS9Y, S100L3K4など
  // FY2022: S100KLVZ, S100KSGFなど
  // FY2023: S100NG2U, S100NM6Fなど
  // FY2024: S100TB45など
  // FY2025: S100T6VC, S100T93Yなど
  
  // ファイル名の日付から推測
  const dateMatch = filePath.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]);
    
    // 3月決算が多いので、3月以前なら同年、4月以降なら前年度
    if (month >= 4) {
      return year;
    } else {
      return year - 1;
    }
  }
  
  // 企業IDパターンから推測（大まかな推定）
  const companyMatch = filePath.match(/S100([A-Z0-9]{4})/);
  if (companyMatch) {
    const code = companyMatch[1];
    
    // 企業IDの文字パターンから年度を推測（おおよその傾向）
    if (code.startsWith('NS') || code.startsWith('L')) return 2021;
    if (code.startsWith('K')) return 2022;
    if (code.startsWith('NG') || code.startsWith('NM') || code.startsWith('NV') || code.startsWith('NW')) return 2023;
    if (code.startsWith('TB') || code.startsWith('T1') || code.startsWith('T3')) return 2024;
    if (code.startsWith('T6') || code.startsWith('T9')) return 2025;
    
    // その他のパターン
    if (code.match(/^[F-J]/)) return 2020;
    if (code.match(/^[A-E]/)) return 2021;
  }
  
  return null;
}

/**
 * メイン処理
 */
async function main() {
  console.log('========================================');
  console.log('📅 fiscal_year修正処理');
  console.log('========================================');
  console.log(`📡 接続先: ${SUPABASE_URL}`);
  console.log(`⚙️ バッチサイズ: ${BATCH_SIZE}`);
  console.log('');
  
  // 現在の状況を確認
  const { count: totalCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 総レコード数: ${totalCount}`);
  
  // fiscal_yearがNULLまたは2015/2016以外のレコードを取得
  console.log('🔍 修正対象レコードを検索中...');
  
  const recordsToFix = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data: records, error } = await supabase
      .from('markdown_files_metadata')
      .select('id, file_path, fiscal_year')
      .or('fiscal_year.is.null,fiscal_year.not.in.(2015,2016)')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('❌ データ取得エラー:', error.message);
      break;
    }
    
    if (!records || records.length === 0) break;
    
    recordsToFix.push(...records);
    console.log(`  ${recordsToFix.length}件取得...`);
    
    if (records.length < limit) break;
    offset += limit;
  }
  
  console.log(`✅ ${recordsToFix.length}件の修正対象を発見`);
  
  if (recordsToFix.length === 0) {
    console.log('✅ 修正対象のレコードはありません');
    return;
  }
  
  // 年度を抽出して更新
  console.log('\n📝 年度情報を抽出・更新中...');
  
  const updates = [];
  const unresolved = [];
  
  for (const record of recordsToFix) {
    const year = extractYearFromPath(record.file_path);
    
    if (year) {
      updates.push({
        id: record.id,
        fiscal_year: year
      });
    } else {
      unresolved.push(record.file_path);
    }
  }
  
  console.log(`  ✅ ${updates.length}件の年度を特定`);
  console.log(`  ⚠️ ${unresolved.length}件は年度を特定できず`);
  
  if (unresolved.length > 0) {
    console.log('\n年度を特定できなかったパスのサンプル:');
    unresolved.slice(0, 5).forEach(path => {
      console.log(`  - ${path}`);
    });
  }
  
  // バッチ更新
  if (updates.length > 0) {
    console.log('\n💾 データベース更新中...');
    
    let updatedCount = 0;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      for (const update of batch) {
        const { error } = await supabase
          .from('markdown_files_metadata')
          .update({ fiscal_year: update.fiscal_year })
          .eq('id', update.id);
        
        if (error) {
          console.error(`  ❌ 更新エラー (ID: ${update.id}):`, error.message);
        } else {
          updatedCount++;
        }
      }
      
      const progress = Math.round((i + batch.length) / updates.length * 100);
      console.log(`  進捗: ${progress}% (${Math.min(i + batch.length, updates.length)}/${updates.length})`);
    }
    
    console.log(`✅ ${updatedCount}件を更新完了`);
  }
  
  // 最終確認
  console.log('\n========================================');
  console.log('📊 修正後の統計');
  console.log('========================================');
  
  const { data: yearStats } = await supabase
    .from('markdown_files_metadata')
    .select('fiscal_year');
  
  if (yearStats) {
    const years = {};
    yearStats.forEach(row => {
      const year = row.fiscal_year || 'NULL';
      years[year] = (years[year] || 0) + 1;
    });
    
    console.log('年度別ファイル数:');
    Object.entries(years).sort((a, b) => {
      if (a[0] === 'NULL') return 1;
      if (b[0] === 'NULL') return -1;
      return parseInt(a[0]) - parseInt(b[0]);
    }).forEach(([year, count]) => {
      if (year === 'NULL') {
        console.log(`  年度不明: ${count.toLocaleString()}ファイル`);
      } else {
        console.log(`  FY${year}: ${count.toLocaleString()}ファイル`);
      }
    });
    
    const total = Object.values(years).reduce((a, b) => a + b, 0);
    console.log(`\n合計: ${total.toLocaleString()}ファイル`);
  }
  
  console.log('\n✅ 修正処理完了！');
}

// 実行
main().catch(error => {
  console.error('❌ 致命的エラー:', error.message);
  process.exit(1);
});