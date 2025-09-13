/**
 * 実際の重複（同一企業・同一年度・同一ファイル名）をチェック
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActualDuplicates() {
  console.log('🔍 実際の重複（同一企業・同一年度・同一ファイル）をチェック...\n');
  console.log('='.repeat(70));
  
  try {
    // 総レコード数
    const { count: totalCount } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 総レコード数: ${(totalCount || 0).toLocaleString()}件\n`);
    
    // サンプルデータで分析
    const { data: sampleData } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, fiscal_year, file_name')
      .order('company_id, fiscal_year, file_name')
      .limit(5000);
    
    if (sampleData) {
      // 企業ごとの年度別ファイル数を集計
      const companyYearStats = {};
      const duplicateKeys = new Set();
      const seenKeys = new Set();
      
      sampleData.forEach(row => {
        const key = `${row.company_id}|${row.fiscal_year}|${row.file_name}`;
        
        // 重複チェック
        if (seenKeys.has(key)) {
          duplicateKeys.add(key);
        } else {
          seenKeys.add(key);
        }
        
        // 企業・年度ごとの集計
        const companyYearKey = `${row.company_id}|${row.fiscal_year}`;
        if (!companyYearStats[companyYearKey]) {
          companyYearStats[companyYearKey] = {
            company_id: row.company_id,
            company_name: row.company_name,
            fiscal_year: row.fiscal_year,
            file_count: 0
          };
        }
        companyYearStats[companyYearKey].file_count++;
      });
      
      console.log('【重複チェック結果（サンプル5000件）】');
      console.log(`  チェック件数: ${sampleData.length}件`);
      console.log(`  ユニークな組み合わせ: ${seenKeys.size}件`);
      console.log(`  重複している組み合わせ: ${duplicateKeys.size}件`);
      
      if (duplicateKeys.size > 0) {
        console.log('\n  ⚠️ 重複例（最初の5件）:');
        Array.from(duplicateKeys).slice(0, 5).forEach(key => {
          const [company_id, year, file] = key.split('|');
          console.log(`    - ${company_id} / FY${year} / ${file.substring(0, 30)}...`);
        });
      } else {
        console.log('  ✅ 重複なし！');
      }
      
      // 企業・年度ごとのファイル数分布
      const fileCountDist = {};
      Object.values(companyYearStats).forEach(stat => {
        const count = stat.file_count;
        fileCountDist[count] = (fileCountDist[count] || 0) + 1;
      });
      
      console.log('\n【1企業1年度あたりのファイル数分布】');
      Object.entries(fileCountDist)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([fileCount, companyCount]) => {
          console.log(`  ${fileCount}ファイル: ${companyCount}件`);
        });
    }
    
    // 年度をまたぐ同一企業のデータを確認
    const { data: multiYearCompanies } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, fiscal_year')
      .limit(10000);
    
    if (multiYearCompanies) {
      const companyYears = {};
      
      multiYearCompanies.forEach(row => {
        if (!companyYears[row.company_id]) {
          companyYears[row.company_id] = {
            name: row.company_name,
            years: new Set()
          };
        }
        companyYears[row.company_id].years.add(row.fiscal_year);
      });
      
      // 複数年度のデータを持つ企業
      const multiYear = Object.entries(companyYears)
        .filter(([id, data]) => data.years.size > 1)
        .map(([id, data]) => ({
          id,
          name: data.name,
          yearCount: data.years.size,
          years: Array.from(data.years).sort()
        }));
      
      console.log('\n【複数年度のデータを持つ企業】');
      console.log(`  該当企業数: ${multiYear.length}社`);
      
      if (multiYear.length > 0) {
        console.log('\n  例（最初の5社）:');
        multiYear.slice(0, 5).forEach(company => {
          console.log(`    ${company.name} (${company.id})`);
          console.log(`      年度: ${company.years.join(', ')}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('【診断結果】');
    
    // 推定される正常なデータ量
    const uniqueCompanies = 10624; // 前回の結果から
    const avgYearsPerCompany = 6.5; // 平均年数
    const filesPerCompanyYear = 8; // 1企業1年度あたりのファイル数
    const expectedTotal = Math.round(uniqueCompanies * avgYearsPerCompany * filesPerCompanyYear);
    
    console.log(`  現在のレコード数: ${totalCount?.toLocaleString()}件`);
    console.log(`  推定される正常値: ${expectedTotal.toLocaleString()}件`);
    
    if (totalCount > expectedTotal * 1.2) {
      console.log('  ⚠️ データ量が多すぎる可能性があります');
    } else {
      console.log('  ✅ データ量は正常範囲内です');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
checkActualDuplicates()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ スクリプトエラー:', error);
    process.exit(1);
  });