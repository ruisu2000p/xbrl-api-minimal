// 実際のデータでmarkdown_files_metadataをテスト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWithRealData() {
  console.log('=== 実データでのテスト ===\n');

  try {
    // 1. 亀田製菓で検索
    console.log('1. 亀田製菓を検索:');
    const { data: kamedaData, error: kamedaError } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .ilike('company_name', '%亀田製菓%')
      .limit(5);
    
    if (kamedaError) {
      console.log('  エラー:', kamedaError.message);
    } else if (kamedaData && kamedaData.length > 0) {
      console.log(`  ${kamedaData.length}件見つかりました:`);
      kamedaData.forEach(doc => {
        console.log(`    - ${doc.company_name} (${doc.company_id})`);
        console.log(`      年度: ${doc.fiscal_year}`);
        console.log(`      ファイル: ${doc.file_name}`);
        console.log(`      Storage: ${doc.storage_path}`);
      });
      
      // ストレージからファイル取得を試みる
      if (kamedaData[0].storage_path) {
        console.log('\n  ファイル取得テスト:');
        const { data: fileData, error: fileError } = await supabase.storage
          .from('markdown-files')
          .download(kamedaData[0].storage_path);
        
        if (fileError) {
          console.log(`    エラー: ${JSON.stringify(fileError)}`);
        } else if (fileData) {
          const text = await fileData.text();
          console.log(`    成功! ファイルサイズ: ${text.length} 文字`);
          console.log(`    最初の200文字:\n${text.substring(0, 200)}...`);
        }
      }
    } else {
      console.log('  データが見つかりません');
    }
    console.log();

    // 2. company_id S1007TVF（フォーバルテレコム）で検索
    console.log('2. フォーバルテレコム (S1007TVF) の全ファイル:');
    const { data: forvalData, error: forvalError } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('company_id', 'S1007TVF')
      .order('file_order');
    
    if (forvalError) {
      console.log('  エラー:', forvalError.message);
    } else if (forvalData && forvalData.length > 0) {
      console.log(`  ${forvalData.length}件のファイル:`);
      
      // ファイルタイプ別に分類
      const byType = {};
      forvalData.forEach(doc => {
        const type = doc.file_type || 'unknown';
        if (!byType[type]) byType[type] = [];
        byType[type].push(doc);
      });
      
      Object.entries(byType).forEach(([type, docs]) => {
        console.log(`\n  [${type}] ${docs.length}件:`);
        docs.slice(0, 3).forEach(doc => {
          console.log(`    - ${doc.file_name}`);
          if (doc.section_title) {
            console.log(`      セクション: ${doc.section_title}`);
          }
        });
      });
    } else {
      console.log('  データが見つかりません');
    }
    console.log();

    // 3. FY2020のデータを取得
    console.log('3. FY2020年度のデータ（最初の10社）:');
    const { data: fy2020Data } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name')
      .eq('fiscal_year', '2020')
      .limit(100);
    
    if (fy2020Data && fy2020Data.length > 0) {
      // ユニークな企業を抽出
      const uniqueCompanies = {};
      fy2020Data.forEach(doc => {
        if (doc.company_name && !uniqueCompanies[doc.company_id]) {
          uniqueCompanies[doc.company_id] = doc.company_name;
        }
      });
      
      const companies = Object.entries(uniqueCompanies).slice(0, 10);
      console.log(`  ${companies.length}社:`);
      companies.forEach(([id, name]) => {
        console.log(`    ${id}: ${name}`);
      });
    }
    console.log();

    // 4. APIエンドポイント経由でテスト（サーバーが起動している場合）
    console.log('4. APIエンドポイント経由でのテスト:');
    try {
      const apiUrl = 'http://localhost:3005/api/v1/markdown-documents';
      
      // 亀田製菓を検索
      const searchQuery = encodeURIComponent('亀田製菓');
      const response = await fetch(`${apiUrl}?query=${searchQuery}&limit=3`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  APIレスポンス: ${data.data?.length || 0}件`);
        if (data.data && data.data.length > 0) {
          console.log('  最初のレコード:');
          console.log(`    ${data.data[0].company_name} (${data.data[0].company_id})`);
        }
      } else {
        console.log('  APIサーバーが起動していないか、エラーが発生しました');
      }
    } catch (error) {
      console.log('  APIサーバーに接続できません（サーバー未起動の可能性）');
    }
    console.log();

    // 5. ストレージバケットの確認
    console.log('5. ストレージバケット確認:');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('  エラー:', bucketsError.message);
    } else if (buckets) {
      console.log('  利用可能なバケット:');
      buckets.forEach(bucket => {
        console.log(`    - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

// 実行
testWithRealData().catch(console.error);