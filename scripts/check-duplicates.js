/**
 * markdown_files_metadataテーブルの重複をチェック
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  console.log('🔍 重複チェックを開始...\n');
  console.log('='.repeat(70));
  
  try {
    // 1. 総レコード数
    const { count: totalCount } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 総レコード数: ${(totalCount || 0).toLocaleString()}件\n`);
    
    // 2. サンプルデータを取得して重複パターンを確認
    const { data: sampleData } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, fiscal_year, file_name')
      .limit(10000);
    
    if (sampleData) {
      // 重複チェック用のキーを作成
      const uniqueKeys = new Set();
      const duplicates = [];
      
      sampleData.forEach(row => {
        const key = `${row.company_id}_${row.fiscal_year}_${row.file_name}`;
        if (uniqueKeys.has(key)) {
          duplicates.push(key);
        } else {
          uniqueKeys.add(key);
        }
      });
      
      console.log('【サンプル10,000件の重複チェック】');
      console.log(`  ユニークレコード: ${uniqueKeys.size.toLocaleString()}件`);
      console.log(`  重複レコード: ${duplicates.length}件`);
      
      if (duplicates.length > 0) {
        console.log('\n【重複例（最初の5件）】');
        duplicates.slice(0, 5).forEach(dup => {
          console.log(`  - ${dup}`);
        });
      }
    }
    
    // 3. 企業IDごとの統計
    const { data: companyStats } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, fiscal_year')
      .limit(50000);
    
    if (companyStats) {
      const companyCounts = {};
      const companyYearCounts = {};
      
      companyStats.forEach(row => {
        companyCounts[row.company_id] = (companyCounts[row.company_id] || 0) + 1;
        const key = `${row.company_id}_${row.fiscal_year}`;
        companyYearCounts[key] = (companyYearCounts[key] || 0) + 1;
      });
      
      // 異常に多いレコードを持つ企業を検出
      const suspiciousCompanies = Object.entries(companyCounts)
        .filter(([id, count]) => count > 100)
        .sort((a, b) => b[1] - a[1]);
      
      console.log('\n【企業別レコード数分析】');
      console.log(`  ユニーク企業数: ${Object.keys(companyCounts).length}社`);
      console.log(`  平均レコード数/企業: ${(totalCount / Object.keys(companyCounts).length).toFixed(1)}件`);
      
      if (suspiciousCompanies.length > 0) {
        console.log('\n【異常に多いレコードを持つ企業（100件以上）】');
        suspiciousCompanies.slice(0, 10).forEach(([id, count]) => {
          console.log(`  ${id}: ${count}件`);
        });
      }
      
      // 企業×年度の組み合わせで異常値を検出
      const suspiciousYears = Object.entries(companyYearCounts)
        .filter(([key, count]) => count > 20)
        .sort((a, b) => b[1] - a[1]);
      
      if (suspiciousYears.length > 0) {
        console.log('\n【1企業1年度で20件以上のレコード】');
        suspiciousYears.slice(0, 10).forEach(([key, count]) => {
          console.log(`  ${key}: ${count}件`);
        });
      }
    }
    
    // 4. ファイル名パターンの分析
    const { data: fileNames } = await supabase
      .from('markdown_files_metadata')
      .select('file_name')
      .limit(1000);
    
    if (fileNames) {
      const filePatterns = {};
      fileNames.forEach(row => {
        const prefix = row.file_name.substring(0, 7);
        filePatterns[prefix] = (filePatterns[prefix] || 0) + 1;
      });
      
      console.log('\n【ファイルタイプ分布（サンプル1000件）】');
      Object.entries(filePatterns)
        .sort((a, b) => b[1] - a[1])
        .forEach(([prefix, count]) => {
          console.log(`  ${prefix}: ${count}件`);
        });
    }
    
    // 5. 重複の可能性診断
    console.log('\n' + '='.repeat(70));
    console.log('【診断結果】');
    
    const avgRecordsPerCompany = totalCount / 13; // 前回の結果から13社
    if (avgRecordsPerCompany > 100) {
      console.log('⚠️ 重複の可能性が高いです！');
      console.log(`  1企業あたり平均${avgRecordsPerCompany.toFixed(0)}件は異常です`);
      console.log('  通常は1企業1年度あたり8〜10ファイル程度です');
    } else {
      console.log('✅ 重複は少ないようです');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
checkDuplicates()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ スクリプトエラー:', error);
    process.exit(1);
  });