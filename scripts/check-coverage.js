/**
 * データカバレッジを簡単にチェック
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoverage() {
  console.log('📊 データカバレッジチェック\n');
  console.log('='.repeat(60));
  
  // 1. companiesテーブル
  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  
  console.log('【企業マスタ】');
  console.log(`  総企業数: ${(companyCount || 0).toLocaleString()}社`);
  
  // 2. markdown_files_metadataテーブル
  const { count: metadataCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n【財務メタデータ】');
  console.log(`  総レコード数: ${(metadataCount || 0).toLocaleString()}件`);
  
  // 3. ユニーク企業数
  const { data: uniqueCompanies } = await supabase
    .from('markdown_files_metadata')
    .select('company_id')
    .limit(50000);
  
  if (uniqueCompanies) {
    const uniqueIds = new Set(uniqueCompanies.map(c => c.company_id));
    console.log(`  ユニーク企業数: ${uniqueIds.size.toLocaleString()}社`);
    console.log(`  平均ファイル数/企業: ${(metadataCount / uniqueIds.size).toFixed(1)}件`);
  }
  
  // 4. 年度別統計
  const { data: yearStats } = await supabase
    .from('markdown_files_metadata')
    .select('fiscal_year');
  
  if (yearStats) {
    const yearCounts = {};
    yearStats.forEach(row => {
      yearCounts[row.fiscal_year] = (yearCounts[row.fiscal_year] || 0) + 1;
    });
    
    console.log('\n【年度別分布】');
    Object.entries(yearCounts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([year, count]) => {
        const percentage = ((count / metadataCount) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(count / 1000));
        console.log(`  FY${year}: ${String(count).padStart(6)}件 (${percentage.padStart(5)}%) ${bar}`);
      });
  }
  
  // 5. Storage推定値との比較
  console.log('\n【Storage推定値との比較】');
  console.log('  Storage内の推定総ファイル数: 約50,000〜100,000件');
  console.log(`  現在のカバー率: 約${((metadataCount / 75000) * 100).toFixed(1)}%`);
  
  // 6. データ品質
  const { data: sampleData } = await supabase
    .from('markdown_files_metadata')
    .select('company_name, ticker_code, sector')
    .limit(1000);
  
  if (sampleData) {
    let hasName = 0;
    let hasTicker = 0; 
    let hasSector = 0;
    
    sampleData.forEach(row => {
      if (row.company_name && !row.company_name.startsWith('企業_')) hasName++;
      if (row.ticker_code) hasTicker++;
      if (row.sector && row.sector !== 'その他') hasSector++;
    });
    
    console.log('\n【データ品質（サンプル1000件）】');
    console.log(`  実企業名: ${(hasName / 10).toFixed(1)}%`);
    console.log(`  ティッカーコード: ${(hasTicker / 10).toFixed(1)}%`);
    console.log(`  セクター分類: ${(hasSector / 10).toFixed(1)}%`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  // 推奨事項
  if (metadataCount < 50000) {
    console.log('\n⚠️ 推奨: さらに多くのメタデータを投入することをお勧めします');
  } else {
    console.log('\n✅ 十分なメタデータが登録されています');
  }
}

// 実行
checkCoverage()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });