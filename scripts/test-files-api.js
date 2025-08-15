const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3003/api/v1';
const API_KEY = 'xbrl_demo_key_2024';

async function testAPI() {
  console.log('===========================================');
  console.log('XBRL API - ファイル取得テスト');
  console.log('===========================================\n');
  
  const testCompanies = ['S100LJ4F', 'S100LJ65', 'S100LJ64', 'S100LJ5C'];
  
  for (const companyId of testCompanies) {
    console.log(`\n========== ${companyId} ==========`);
    
    try {
      // 1. ファイル一覧を取得
      console.log('\n1. ファイル一覧を取得...');
      const listResponse = await fetch(`${API_BASE}/companies/${companyId}/files?year=2021`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!listResponse.ok) {
        console.error(`  ❌ エラー: ${listResponse.status} ${listResponse.statusText}`);
        continue;
      }
      
      const listData = await listResponse.json();
      console.log(`  ✅ 企業名: ${listData.company_name}`);
      console.log(`  ✅ ファイル数: ${listData.total_files}`);
      console.log(`  ✅ 年度: ${listData.year}`);
      
      // ファイル一覧を表示
      console.log('\n  📁 ファイル一覧:');
      listData.files.slice(0, 5).forEach(file => {
        console.log(`    [${file.index}] ${file.section} - ${file.name} (${Math.round(file.size / 1024)}KB)`);
      });
      if (listData.files.length > 5) {
        console.log(`    ... 他${listData.files.length - 5}ファイル`);
      }
      
      // 2. 特定のファイルを取得（企業の概況）
      console.log('\n2. 企業の概況ファイルを取得...');
      const overviewFile = listData.files.find(f => f.section === '企業の概況');
      
      if (overviewFile) {
        const fileResponse = await fetch(
          `${API_BASE}/companies/${companyId}/files?year=2021&file=${overviewFile.index}`,
          {
            headers: {
              'x-api-key': API_KEY
            }
          }
        );
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          console.log(`  ✅ ファイル取得成功: ${fileData.file.name}`);
          
          // コンテンツの最初の部分を表示
          const contentPreview = fileData.file.content.substring(0, 200);
          console.log(`  📄 内容プレビュー:\n    ${contentPreview.replace(/\n/g, '\n    ')}...`);
        } else {
          console.error(`  ❌ ファイル取得エラー: ${fileResponse.status}`);
        }
      } else {
        console.log('  ⚠️ 企業の概況ファイルが見つかりません');
      }
      
    } catch (error) {
      console.error(`❌ エラー: ${error.message}`);
    }
  }
  
  console.log('\n===========================================');
  console.log('テスト完了');
  console.log('===========================================');
}

// 実行
testAPI().catch(console.error);