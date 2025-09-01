/**
 * UNKNOWN企業IDを修正
 * ファイル名から企業コードを抽出して更新
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

/**
 * ファイルパスから企業IDを抽出（改良版）
 */
function extractCompanyId(filePath) {
  // パターン1: FY2024/S100XXXX/形式
  const match1 = filePath.match(/FY\d{4}\/([S][0-9]{3,4}[A-Z0-9]{2,4})\//i);
  if (match1) {
    return match1[1].toUpperCase();
  }
  
  // パターン2: ファイル名に含まれるEコード（E00112-000など）から推測
  const match2 = filePath.match(/E(\d{5})-/);
  if (match2) {
    // Eコードは企業固有なので、これを仮の企業IDとして使用
    return `E${match2[1]}`;
  }
  
  // パターン3: S100形式を含むパス
  const match3 = filePath.match(/([S][0-9]{3,4}[A-Z0-9]{2,4})/i);
  if (match3) {
    return match3[1].toUpperCase();
  }
  
  return null;
}

async function main() {
  console.log('========================================');
  console.log('🔧 UNKNOWN企業IDの修正');
  console.log('========================================\n');
  
  // UNKNOWNで始まる企業IDを持つレコードを取得
  console.log('📋 UNKNOWN企業IDのレコードを検索中...');
  
  const unknownRecords = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data: records, error } = await supabase
      .from('markdown_files_metadata')
      .select('id, file_path, company_id')
      .like('company_id', 'UNKNOWN%')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('❌ データ取得エラー:', error.message);
      break;
    }
    
    if (!records || records.length === 0) break;
    
    unknownRecords.push(...records);
    console.log(`  ${unknownRecords.length}件取得...`);
    
    if (records.length < limit) break;
    offset += limit;
  }
  
  console.log(`✅ ${unknownRecords.length}件のUNKNOWNレコードを発見`);
  
  if (unknownRecords.length === 0) {
    console.log('✅ 修正対象のレコードはありません');
    return;
  }
  
  // サンプル表示
  console.log('\nサンプル（最初の5件）:');
  unknownRecords.slice(0, 5).forEach(record => {
    console.log(`  ${record.company_id} <- ${record.file_path.substring(0, 60)}...`);
  });
  
  // 企業IDを抽出して更新
  console.log('\n📝 企業IDを抽出中...');
  
  const updates = [];
  const stillUnknown = [];
  
  for (const record of unknownRecords) {
    const newCompanyId = extractCompanyId(record.file_path);
    
    if (newCompanyId) {
      updates.push({
        id: record.id,
        company_id: newCompanyId
      });
    } else {
      stillUnknown.push(record.file_path);
    }
  }
  
  console.log(`  ✅ ${updates.length}件の企業IDを特定`);
  console.log(`  ⚠️ ${stillUnknown.length}件は特定できず`);
  
  if (stillUnknown.length > 0) {
    console.log('\n特定できなかったパスのサンプル:');
    stillUnknown.slice(0, 5).forEach(path => {
      console.log(`  - ${path}`);
    });
  }
  
  // バッチ更新
  if (updates.length > 0) {
    console.log('\n💾 データベース更新中...');
    
    let updatedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { error } = await supabase
          .from('markdown_files_metadata')
          .update({ company_id: update.company_id })
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
  
  const { count: totalCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  const { count: unknownCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true })
    .like('company_id', 'UNKNOWN%');
  
  console.log(`総レコード数: ${totalCount}`);
  console.log(`UNKNOWN企業ID: ${unknownCount}件 (${((unknownCount/totalCount)*100).toFixed(1)}%)`);
  
  // 企業IDの種類を確認
  const { data: companyStats } = await supabase
    .from('markdown_files_metadata')
    .select('company_id')
    .limit(10000);
  
  if (companyStats) {
    const uniqueCompanies = new Set(companyStats.map(c => c.company_id));
    const normalCount = Array.from(uniqueCompanies).filter(id => !id.startsWith('UNKNOWN')).length;
    
    console.log(`\nユニーク企業ID: ${uniqueCompanies.size}件`);
    console.log(`正常な企業ID: ${normalCount}件`);
  }
  
  console.log('\n✅ 修正処理完了！');
}

// 実行
main().catch(error => {
  console.error('❌ 致命的エラー:', error.message);
  process.exit(1);
});