// markdown_files_metadataテーブルの詳細分析
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeMetadata() {
  console.log('=== markdown_files_metadata テーブル詳細分析 ===\n');

  try {
    // 1. company_nameがnullでないレコードを検索
    console.log('1. company_nameが設定されているレコード:');
    const { data: namedRecords, count: namedCount } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, fiscal_year', { count: 'exact' })
      .not('company_name', 'is', null)
      .limit(10);
    
    console.log(`  company_name設定済み: ${namedCount || 0}件`);
    if (namedRecords && namedRecords.length > 0) {
      console.log('  サンプル:');
      namedRecords.forEach(r => {
        console.log(`    ${r.company_id}: ${r.company_name} (${r.fiscal_year})`);
      });
    }
    console.log();

    // 2. ユニークなcompany_idを取得
    console.log('2. ユニークなcompany_id（最初の20件）:');
    const { data: allIds } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, fiscal_year')
      .limit(1000);
    
    if (allIds) {
      const uniqueIds = {};
      allIds.forEach(record => {
        if (!uniqueIds[record.company_id]) {
          uniqueIds[record.company_id] = new Set();
        }
        uniqueIds[record.company_id].add(record.fiscal_year);
      });
      
      const idList = Object.entries(uniqueIds).slice(0, 20);
      idList.forEach(([id, years]) => {
        console.log(`    ${id}: ${Array.from(years).join(', ')}`);
      });
      console.log(`  （全${Object.keys(uniqueIds).length}社）`);
    }
    console.log();

    // 3. file_name パターン分析
    console.log('3. file_name パターン分析:');
    const { data: files } = await supabase
      .from('markdown_files_metadata')
      .select('file_name')
      .limit(100);
    
    if (files) {
      const patterns = {
        'header': 0,
        'honbun': 0,
        'toc': 0,
        'manifest': 0,
        'その他': 0
      };
      
      files.forEach(f => {
        const name = f.file_name || '';
        if (name.includes('header')) patterns['header']++;
        else if (name.includes('honbun')) patterns['honbun']++;
        else if (name.includes('toc')) patterns['toc']++;
        else if (name.includes('manifest')) patterns['manifest']++;
        else patterns['その他']++;
      });
      
      Object.entries(patterns).forEach(([pattern, count]) => {
        if (count > 0) {
          console.log(`    ${pattern}: ${count}件`);
        }
      });
    }
    console.log();

    // 4. 特定のcompany_idで全ファイル取得テスト
    console.log('4. 特定企業（S1004INU）の全ファイル:');
    const { data: companyFiles } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', 'S1004INU')
      .order('file_order');
    
    if (companyFiles && companyFiles.length > 0) {
      console.log(`  ${companyFiles.length}件のファイル:`);
      companyFiles.forEach(f => {
        console.log(`    [${f.file_order || '-'}] ${f.file_name}`);
        if (f.section_title) {
          console.log(`        セクション: ${f.section_title}`);
        }
      });
    }
    console.log();

    // 5. storage_pathの形式確認
    console.log('5. storage_path パターン:');
    const { data: paths } = await supabase
      .from('markdown_files_metadata')
      .select('storage_path')
      .not('storage_path', 'is', null)
      .limit(5);
    
    if (paths && paths.length > 0) {
      console.log('  サンプルパス:');
      paths.forEach(p => {
        console.log(`    ${p.storage_path}`);
      });
    }
    console.log();

    // 6. fiscal_yearとdoc_category別の統計
    console.log('6. 年度・カテゴリ別統計:');
    const { data: stats } = await supabase
      .from('markdown_files_metadata')
      .select('fiscal_year, doc_category');
    
    if (stats) {
      const summary = {};
      stats.forEach(s => {
        const key = `${s.fiscal_year}_${s.doc_category || 'unknown'}`;
        summary[key] = (summary[key] || 0) + 1;
      });
      
      Object.entries(summary).sort().forEach(([key, count]) => {
        console.log(`    ${key}: ${count}件`);
      });
    }

  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
analyzeMetadata().catch(console.error);