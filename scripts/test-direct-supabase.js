// Direct Supabase test for markdown_files_metadata
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMarkdownMetadata() {
  console.log('=== Direct Supabase Test for Markdown Files ===\n');

  try {
    // Test 1: Check table exists and get count
    console.log('1. markdown_files_metadata テーブルの確認:');
    const { count, error: countError } = await supabase
      .from('markdown_files_metadata')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('  エラー:', countError.message);
    } else {
      console.log(`  総レコード数: ${count}`);
    }
    console.log();

    // Test 2: Search for クスリのアオキ
    console.log('2. クスリのアオキを検索:');
    const { data: kusuriData, error: kusuriError } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, fiscal_year, file_name, storage_path')
      .ilike('company_name', '%クスリ%')
      .limit(5);
    
    if (kusuriError) {
      console.log('  エラー:', kusuriError.message);
    } else if (kusuriData && kusuriData.length > 0) {
      console.log(`  ${kusuriData.length}件見つかりました:`);
      kusuriData.forEach(doc => {
        console.log(`    - ${doc.company_name} (${doc.company_id})`);
        console.log(`      年度: ${doc.fiscal_year}`);
        console.log(`      ファイル: ${doc.file_name}`);
      });
    } else {
      console.log('  データが見つかりません');
    }
    console.log();

    // Test 3: Get sample data with storage paths
    console.log('3. Storage pathを持つサンプルデータ:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .not('storage_path', 'is', null)
      .limit(3);
    
    if (sampleError) {
      console.log('  エラー:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log(`  ${sampleData.length}件のサンプル:`);
      for (const doc of sampleData) {
        console.log(`\n  ${doc.company_name} (${doc.company_id}):`);
        console.log(`    Storage Path: ${doc.storage_path}`);
        
        // Try to download from storage
        if (doc.storage_path) {
          const { data: fileData, error: fileError } = await supabase.storage
            .from('markdown-files')
            .download(doc.storage_path);
          
          if (fileError) {
            console.log(`    Storage取得エラー: ${fileError.message}`);
          } else if (fileData) {
            const text = await fileData.text();
            console.log(`    ファイルサイズ: ${text.length} 文字`);
            console.log(`    最初の100文字: ${text.substring(0, 100)}...`);
          }
        }
      }
    } else {
      console.log('  Storage pathを持つデータが見つかりません');
    }
    console.log();

    // Test 4: Check unique fiscal years
    console.log('4. 利用可能な年度:');
    const { data: years, error: yearsError } = await supabase
      .from('markdown_files_metadata')
      .select('fiscal_year')
      .not('fiscal_year', 'is', null);
    
    if (yearsError) {
      console.log('  エラー:', yearsError.message);
    } else if (years) {
      const uniqueYears = [...new Set(years.map(y => y.fiscal_year))].sort();
      console.log(`  ${uniqueYears.join(', ')}`);
    }
    console.log();

    // Test 5: Check ID patterns
    console.log('5. company_id パターン分析:');
    const { data: ids, error: idsError } = await supabase
      .from('markdown_files_metadata')
      .select('company_id')
      .limit(100);
    
    if (idsError) {
      console.log('  エラー:', idsError.message);
    } else if (ids) {
      const patterns = {
        'S1004...': 0,
        'S1005...': 0,
        'S100T...': 0,
        'S100U...': 0,
        'その他': 0
      };
      
      ids.forEach(record => {
        const id = record.company_id;
        if (id.startsWith('S1004')) patterns['S1004...']++;
        else if (id.startsWith('S1005')) patterns['S1005...']++;
        else if (id.startsWith('S100T')) patterns['S100T...']++;
        else if (id.startsWith('S100U')) patterns['S100U...']++;
        else patterns['その他']++;
      });
      
      Object.entries(patterns).forEach(([pattern, count]) => {
        if (count > 0) {
          console.log(`    ${pattern}: ${count}件`);
        }
      });
    }
    
  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

// 実行
testMarkdownMetadata().catch(console.error);