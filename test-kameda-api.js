// 亀田製菓のデータ取得テスト
const API_KEY = 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';
const BASE_URL = 'https://xbrl-api-minimal.vercel.app/api/v1';

async function testKamedaData() {
  console.log('=== 亀田製菓 財務データ取得テスト ===\n');
  
  try {
    // 1. 企業検索
    console.log('1. 亀田製菓を検索中...');
    const searchUrl = `${BASE_URL}/companies?search=${encodeURIComponent('亀田製菓')}&per_page=5`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    console.log('検索結果:', JSON.stringify(searchData, null, 2));
    
    if (searchData.companies && searchData.companies.length > 0) {
      const kameda = searchData.companies[0];
      console.log('\n亀田製菓が見つかりました:');
      console.log('- ID:', kameda.id);
      console.log('- 名前:', kameda.name);
      console.log('- 作成日:', kameda.created_at);
      
      // 2. さらに詳細情報を取得（別のエンドポイントを試す）
      console.log('\n2. 追加情報を検索中...');
      
      // セクター情報などが入っていないか確認
      if (kameda.sector) {
        console.log('- セクター:', kameda.sector);
      }
      if (kameda.market) {
        console.log('- 市場:', kameda.market);
      }
      if (kameda.description) {
        console.log('- 説明:', kameda.description);
      }
      
      // 3. ページネーションで全企業から探す
      console.log('\n3. データベース内の位置を確認...');
      const allCompaniesUrl = `${BASE_URL}/companies?page=1&per_page=100`;
      const allResponse = await fetch(allCompaniesUrl, {
        headers: {
          'X-API-Key': API_KEY
        }
      });
      
      if (allResponse.ok) {
        const allData = await allResponse.json();
        console.log('- 総企業数:', allData.total);
        console.log('- ページ数:', allData.total_pages);
        
        // 亀田製菓がどのページにあるか推定
        const kamedaIndex = searchData.companies[0].id;
        console.log('- 亀田製菓のID:', kamedaIndex);
      }
      
    } else {
      console.log('亀田製菓が見つかりませんでした。');
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

// Node.js環境で実行
if (typeof window === 'undefined') {
  import('node-fetch').then(module => {
    global.fetch = module.default;
    testKamedaData();
  }).catch(err => {
    console.error('node-fetch import error:', err);
  });
} else {
  testKamedaData();
}