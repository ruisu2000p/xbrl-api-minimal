// 修正後のAPIの最終テスト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFinalAPI() {
  console.log('=== 最終APIテスト ===\n');

  try {
    // 1. 直接Supabaseでファイル取得テスト
    console.log('1. 直接Supabaseでのファイル取得:');
    
    // 亀田製菓のデータを取得
    const { data: kamedaData } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .ilike('company_name', '%亀田製菓%')
      .eq('fiscal_year', '2024')
      .limit(1);
    
    if (kamedaData && kamedaData[0]) {
      const record = kamedaData[0];
      console.log(`  企業: ${record.company_name} (${record.company_id})`);
      console.log(`  年度: ${record.fiscal_year}`);
      console.log(`  ファイル: ${record.file_name}`);
      console.log(`  元のパス: ${record.storage_path}`);
      
      // パスをクリーン
      const cleanPath = record.storage_path.replace(/^markdown-files\//, '');
      console.log(`  修正パス: ${cleanPath}`);
      
      // ファイル取得
      const { data: fileData, error: fileError } = await supabase.storage
        .from('markdown-files')
        .download(cleanPath);
      
      if (fileError) {
        console.log(`  エラー: ${JSON.stringify(fileError)}`);
      } else if (fileData) {
        const text = await fileData.text();
        console.log(`  ✅ 成功! ファイルサイズ: ${text.length} 文字`);
        console.log(`  内容の最初の300文字:\n${text.substring(0, 300)}`);
      }
    }
    console.log();

    // 2. APIエンドポイント経由でテスト（サーバー起動時）
    console.log('2. APIエンドポイント経由での取得:');
    try {
      const apiUrl = 'http://localhost:3005/api/v1/markdown-documents';
      
      // include_content=trueで亀田製菓を検索
      const searchQuery = encodeURIComponent('亀田製菓');
      const response = await fetch(`${apiUrl}?query=${searchQuery}&fiscal_year=2024&include_content=true&limit=1`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  APIステータス: ${response.status} OK`);
        console.log(`  取得件数: ${data.data?.length || 0}件`);
        
        if (data.data && data.data[0]) {
          const doc = data.data[0];
          console.log(`  企業: ${doc.company_name}`);
          console.log(`  ファイル: ${doc.file_name}`);
          
          if (doc.content) {
            console.log(`  ✅ コンテンツ取得成功! サイズ: ${doc.content.length} 文字`);
            console.log(`  内容の最初の200文字:\n${doc.content.substring(0, 200)}`);
          } else if (doc.content_error) {
            console.log(`  ❌ コンテンツ取得エラー: ${doc.content_error}`);
          } else {
            console.log('  ⚠️ コンテンツなし');
          }
        }
      } else {
        console.log(`  APIエラー: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`  APIサーバー未起動またはエラー: ${error.message}`);
    }
    console.log();

    // 3. POSTメソッドでの一括取得テスト
    console.log('3. POST APIでの一括取得:');
    try {
      const apiUrl = 'http://localhost:3005/api/v1/markdown-documents';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: 'S100TMYO',
          fiscal_year: '2024'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  企業: ${data.company?.name || 'Unknown'}`);
        console.log(`  取得ドキュメント数: ${data.documents?.length || 0}`);
        console.log(`  成功: ${data.summary?.successful_downloads || 0}件`);
        console.log(`  失敗: ${data.summary?.failed_downloads || 0}件`);
        
        if (data.documents && data.documents.length > 0) {
          console.log('\n  ファイル一覧:');
          data.documents.slice(0, 3).forEach(doc => {
            const status = doc.content ? '✅' : '❌';
            const size = doc.content ? `${doc.content.length}文字` : doc.content_error || 'エラー';
            console.log(`    ${status} ${doc.file_name} (${size})`);
          });
        }
      } else {
        console.log(`  APIエラー: ${response.status}`);
      }
    } catch (error) {
      console.log(`  エラー: ${error.message}`);
    }
    console.log();

    // 4. 他の企業でもテスト
    console.log('4. 他の企業データ取得テスト:');
    
    const { data: otherCompanies } = await supabase
      .from('markdown_files_metadata')
      .select('company_id, company_name, fiscal_year, storage_path')
      .not('company_name', 'is', null)
      .neq('company_id', 'S100TMYO')
      .limit(3);
    
    if (otherCompanies) {
      for (const company of otherCompanies) {
        console.log(`\n  ${company.company_name} (${company.company_id}, ${company.fiscal_year}):`);
        
        const cleanPath = company.storage_path.replace(/^markdown-files\//, '');
        const { data: fileData, error: fileError } = await supabase.storage
          .from('markdown-files')
          .download(cleanPath);
        
        if (fileError) {
          console.log(`    ❌ エラー: ${fileError.message || JSON.stringify(fileError)}`);
        } else if (fileData) {
          const text = await fileData.text();
          console.log(`    ✅ 成功! ${text.length} 文字`);
        }
      }
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

// 実行
testFinalAPI().catch(console.error);