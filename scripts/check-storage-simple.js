/**
 * Supabase Storageの内容を簡単に確認
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

async function checkStorage() {
  console.log('🔍 Storage内容を確認中...\n');
  
  try {
    // ルートフォルダの内容を確認
    console.log('📁 ルートフォルダをチェック...');
    const { data: rootFolders, error: rootError } = await supabase.storage
      .from('markdown-files')
      .list('', {
        limit: 10,
        offset: 0
      });
    
    if (rootError) {
      console.error('❌ ルートフォルダエラー:', rootError);
      return;
    }
    
    if (!rootFolders || rootFolders.length === 0) {
      console.log('⚠️ markdown-filesバケットは空です');
      return;
    }
    
    console.log(`✅ ${rootFolders.length}個のフォルダ/ファイルが見つかりました:`);
    rootFolders.forEach(item => {
      console.log(`  - ${item.name}`);
    });
    
    // FY2024フォルダをチェック
    console.log('\n📁 FY2024フォルダをチェック...');
    const { data: fy2024, error: fy2024Error } = await supabase.storage
      .from('markdown-files')
      .list('FY2024', {
        limit: 5,
        offset: 0
      });
    
    if (fy2024Error) {
      console.log('⚠️ FY2024フォルダが存在しません');
    } else if (fy2024 && fy2024.length > 0) {
      console.log(`✅ FY2024に${fy2024.length}個の企業フォルダがあります:`);
      fy2024.slice(0, 5).forEach(item => {
        console.log(`  - ${item.name}`);
      });
      
      // 最初の企業のファイルをチェック
      if (fy2024[0]) {
        const companyId = fy2024[0].name;
        const docPath = `FY2024/${companyId}/PublicDoc_markdown`;
        
        console.log(`\n📄 ${companyId}のドキュメントをチェック...`);
        const { data: docs, error: docsError } = await supabase.storage
          .from('markdown-files')
          .list(docPath, {
            limit: 5,
            offset: 0
          });
        
        if (docsError) {
          console.log('⚠️ ドキュメントフォルダが存在しません');
        } else if (docs && docs.length > 0) {
          console.log(`✅ ${docs.length}個のMarkdownファイルがあります:`);
          docs.forEach(doc => {
            console.log(`  - ${doc.name} (${doc.metadata?.size || 0} bytes)`);
          });
        }
      }
    }
    
    // 利用可能な年度を確認
    console.log('\n📅 利用可能な年度を確認...');
    const years = ['FY2015', 'FY2016', 'FY2017', 'FY2018', 'FY2019', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024'];
    const availableYears = [];
    
    for (const year of years) {
      const { data, error } = await supabase.storage
        .from('markdown-files')
        .list(year, { limit: 1 });
      
      if (!error && data && data.length > 0) {
        availableYears.push(year);
      }
    }
    
    if (availableYears.length > 0) {
      console.log(`✅ 利用可能な年度: ${availableYears.join(', ')}`);
    } else {
      console.log('⚠️ 利用可能な年度が見つかりません');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
checkStorage()
  .then(() => {
    console.log('\n✅ チェック完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ スクリプトエラー:', error);
    process.exit(1);
  });