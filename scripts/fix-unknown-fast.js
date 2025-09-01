/**
 * UNKNOWN企業IDを高速修正（バルク更新版）
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
  
  // パターン2: Eコードから推測
  const match2 = filePath.match(/E(\d{5})-/);
  if (match2) {
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
  console.log('🚀 UNKNOWN企業IDの高速修正');
  console.log('========================================\n');
  
  const startTime = Date.now();
  
  // UNKNOWNレコードを全件取得
  console.log('📋 UNKNOWN企業IDのレコードを一括取得中...');
  
  const allUnknownRecords = [];
  let offset = 0;
  const limit = 1000; // Supabaseの制限
  
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
    
    allUnknownRecords.push(...records);
    console.log(`  ${allUnknownRecords.length}件取得...`);
    
    if (records.length < limit) break;
    offset += limit;
  }
  
  console.log(`✅ ${allUnknownRecords.length}件のUNKNOWNレコードを取得`);
  
  if (allUnknownRecords.length === 0) {
    console.log('✅ 修正対象のレコードはありません');
    return;
  }
  
  // 企業IDを抽出
  console.log('\n📝 企業IDを一括抽出中...');
  
  const updates = [];
  const stillUnknown = [];
  
  for (const record of allUnknownRecords) {
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
  
  // 並列バッチ更新
  if (updates.length > 0) {
    console.log('\n💾 データベース並列更新中...');
    
    const batchSize = 500; // バッチサイズを大きく
    const batches = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize));
    }
    
    console.log(`  ${batches.length}個のバッチに分割（各${batchSize}件）`);
    
    let completedBatches = 0;
    let updatedCount = 0;
    
    // 並列処理（最大5つ同時）
    const concurrentLimit = 5;
    
    for (let i = 0; i < batches.length; i += concurrentLimit) {
      const currentBatches = batches.slice(i, Math.min(i + concurrentLimit, batches.length));
      
      const promises = currentBatches.map(async (batch, index) => {
        const batchNum = i + index + 1;
        console.log(`  バッチ ${batchNum}/${batches.length} 処理中...`);
        
        // バッチ内の更新を並列実行
        const updatePromises = batch.map(update => 
          supabase
            .from('markdown_files_metadata')
            .update({ company_id: update.company_id })
            .eq('id', update.id)
        );
        
        const results = await Promise.allSettled(updatePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
        
        return successCount;
      });
      
      const batchResults = await Promise.all(promises);
      const batchSuccessTotal = batchResults.reduce((sum, count) => sum + count, 0);
      updatedCount += batchSuccessTotal;
      completedBatches += currentBatches.length;
      
      const progress = Math.round((completedBatches / batches.length) * 100);
      console.log(`  進捗: ${progress}% (${completedBatches}/${batches.length}バッチ完了, ${updatedCount}件更新済み)`);
    }
    
    console.log(`\n✅ ${updatedCount}件を更新完了`);
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
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`総レコード数: ${totalCount?.toLocaleString()}`);
  console.log(`UNKNOWN企業ID: ${unknownCount?.toLocaleString()}件 (${((unknownCount/totalCount)*100).toFixed(1)}%)`);
  console.log(`処理時間: ${elapsedTime}秒`);
  
  // 企業IDの種類を確認
  console.log('\n📊 ユニーク企業IDの確認中...');
  const { data: companyStats } = await supabase
    .from('markdown_files_metadata')
    .select('company_id')
    .limit(20000);
  
  if (companyStats) {
    const uniqueCompanies = new Set(companyStats.map(c => c.company_id));
    const normalCount = Array.from(uniqueCompanies).filter(id => !id.startsWith('UNKNOWN')).length;
    
    console.log(`ユニーク企業ID: ${uniqueCompanies.size}件`);
    console.log(`正常な企業ID: ${normalCount}件`);
  }
  
  console.log('\n✅ 高速修正処理完了！');
}

// 実行
main().catch(error => {
  console.error('❌ 致命的エラー:', error.message);
  process.exit(1);
});