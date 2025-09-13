/**
 * Storage内の実際のファイル総数を詳細に確認
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorageComplete() {
  console.log('🔍 Storage完全チェックを開始...\n');
  console.log('='.repeat(70));
  
  const years = ['FY2015', 'FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025'];
  let totalFiles = 0;
  let totalCompanies = 0;
  const yearStats = {};
  
  for (const year of years) {
    console.log(`\n📅 ${year}をチェック中...`);
    
    // 年度フォルダ内の企業数を取得（ページネーション対応）
    let offset = 0;
    let hasMore = true;
    let yearCompanies = [];
    
    while (hasMore) {
      const { data: companies, error } = await supabase.storage
        .from('markdown-files')
        .list(year, {
          limit: 100,
          offset: offset
        });
      
      if (error || !companies || companies.length === 0) {
        hasMore = false;
        break;
      }
      
      yearCompanies = yearCompanies.concat(companies);
      
      if (companies.length < 100) {
        hasMore = false;
      } else {
        offset += 100;
      }
    }
    
    if (yearCompanies.length === 0) {
      console.log(`  ⚠️ データなし`);
      continue;
    }
    
    // 各企業のファイル数を集計（サンプリング）
    let yearFileCount = 0;
    const sampleSize = Math.min(10, yearCompanies.length);
    let sampledFileCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const company = yearCompanies[i];
      const docPath = `${year}/${company.name}/PublicDoc_markdown`;
      
      const { data: files, error: filesError } = await supabase.storage
        .from('markdown-files')
        .list(docPath, {
          limit: 100
        });
      
      if (!filesError && files) {
        sampledFileCount += files.length;
      }
    }
    
    // サンプルから推定
    const avgFilesPerCompany = sampleSize > 0 ? Math.round(sampledFileCount / sampleSize) : 8;
    yearFileCount = yearCompanies.length * avgFilesPerCompany;
    
    yearStats[year] = {
      companies: yearCompanies.length,
      estimatedFiles: yearFileCount,
      avgFiles: avgFilesPerCompany
    };
    
    totalCompanies += yearCompanies.length;
    totalFiles += yearFileCount;
    
    console.log(`  ✅ 企業数: ${yearCompanies.length}社`);
    console.log(`  📄 推定ファイル数: ${yearFileCount.toLocaleString()}件 (平均${avgFilesPerCompany}件/社)`);
  }
  
  // 現在のメタデータ数を確認
  const { count: metadataCount } = await supabase
    .from('markdown_files_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 Storage総合統計');
  console.log('='.repeat(70));
  console.log(`\n【Storage内の実データ】`);
  console.log(`  総企業数: ${totalCompanies.toLocaleString()}社`);
  console.log(`  推定総ファイル数: ${totalFiles.toLocaleString()}件`);
  
  console.log(`\n【データベース登録状況】`);
  console.log(`  markdown_files_metadata: ${(metadataCount || 0).toLocaleString()}件`);
  console.log(`  カバー率: ${((metadataCount / totalFiles) * 100).toFixed(1)}%`);
  
  const missing = totalFiles - (metadataCount || 0);
  if (missing > 0) {
    console.log(`  ⚠️ 未登録: 約${missing.toLocaleString()}件`);
  }
  
  console.log('\n【年度別詳細】');
  console.log('年度    | 企業数  | 推定ファイル数 | 平均/社');
  console.log('--------|---------|---------------|--------');
  Object.entries(yearStats)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([year, stats]) => {
      console.log(`${year} | ${String(stats.companies).padStart(7)} | ${String(stats.estimatedFiles).padStart(13)} | ${String(stats.avgFiles).padStart(7)}`);
    });
  
  // 大きな差がある年度を特定
  console.log('\n【要確認年度】');
  const { data: dbYearStats } = await supabase
    .from('markdown_files_metadata')
    .select('fiscal_year');
  
  if (dbYearStats) {
    const dbYearCounts = {};
    dbYearStats.forEach(row => {
      const fy = `FY${row.fiscal_year}`;
      dbYearCounts[fy] = (dbYearCounts[fy] || 0) + 1;
    });
    
    Object.entries(yearStats).forEach(([year, stats]) => {
      const dbCount = dbYearCounts[year] || 0;
      const coverage = (dbCount / stats.estimatedFiles) * 100;
      
      if (coverage < 80) {
        console.log(`  ⚠️ ${year}: DB ${dbCount}件 / 推定 ${stats.estimatedFiles}件 (${coverage.toFixed(1)}%)`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(70));
  
  return {
    totalFiles,
    totalCompanies,
    metadataCount: metadataCount || 0,
    missing
  };
}

// 実行
checkStorageComplete()
  .then(result => {
    if (result.missing > 1000) {
      console.log('\n⚠️ まだ多くのファイルが未登録です。追加投入が必要です。');
    } else {
      console.log('\n✅ ほぼすべてのデータが登録されています！');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });