// Supabaseの検索機能をテストするスクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testSearch() {
  console.log('=== Supabase検索テスト ===\n');
  
  // 1. 総件数を確認
  const { count: totalCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  console.log(`総企業数: ${totalCount}件\n`);

  // 2. 「クスリ」を含む企業を検索（ilike）
  console.log('検索方法1: ilike演算子で「クスリ」を検索');
  const { data: ilikeResult, error: ilikeError } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%クスリ%')
    .limit(10);
  
  if (ilikeError) {
    console.log('エラー:', ilikeError);
  } else {
    console.log(`結果: ${ilikeResult?.length || 0}件`);
    ilikeResult?.forEach(company => {
      console.log(`  - ${company.id}: ${company.name}`);
    });
  }
  console.log();

  // 3. or演算子を使った検索
  console.log('検索方法2: or演算子で複数フィールド検索');
  const { data: orResult, error: orError } = await supabase
    .from('companies')
    .select('id, name')
    .or('name.ilike.%クスリ%,id.ilike.%クスリ%')
    .limit(10);
  
  if (orError) {
    console.log('エラー:', orError);
  } else {
    console.log(`結果: ${orResult?.length || 0}件`);
    orResult?.forEach(company => {
      console.log(`  - ${company.id}: ${company.name}`);
    });
  }
  console.log();

  // 4. 特定のIDで直接取得
  console.log('検索方法3: IDで直接取得 (S100U8R6)');
  const { data: directResult, error: directError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', 'S100U8R6')
    .single();
  
  if (directError) {
    console.log('エラー:', directError);
  } else if (directResult) {
    console.log('結果:');
    console.log(`  ID: ${directResult.id}`);
    console.log(`  名前: ${directResult.name}`);
    console.log(`  説明: ${directResult.description}`);
  }
  console.log();

  // 5. 全データ取得してクライアント側で検索
  console.log('検索方法4: 全データ取得してクライアント側で検索');
  const { data: allData, error: allError } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1000);
  
  if (allError) {
    console.log('エラー:', allError);
  } else {
    const filtered = allData?.filter(c => 
      c.name && c.name.includes('クスリ')
    ) || [];
    console.log(`結果: ${filtered.length}件`);
    filtered.slice(0, 10).forEach(company => {
      console.log(`  - ${company.id}: ${company.name}`);
    });
  }
  console.log();

  // 6. ページネーションで全データをスキャン
  console.log('検索方法5: ページネーションで全データスキャン');
  let foundCompanies = [];
  let page = 0;
  const perPage = 1000;
  
  while (page < 20) {  // 最大20ページまで
    const { data: pageData, error: pageError } = await supabase
      .from('companies')
      .select('id, name')
      .range(page * perPage, (page + 1) * perPage - 1);
    
    if (pageError) {
      console.log(`ページ${page + 1}でエラー:`, pageError);
      break;
    }
    
    if (!pageData || pageData.length === 0) {
      break;
    }
    
    const pageFiltered = pageData.filter(c => 
      c.name && c.name.includes('クスリ')
    );
    foundCompanies = foundCompanies.concat(pageFiltered);
    
    console.log(`  ページ${page + 1}: ${pageData.length}件中${pageFiltered.length}件発見`);
    page++;
  }
  
  console.log(`\n合計: ${foundCompanies.length}件発見`);
  foundCompanies.forEach(company => {
    console.log(`  - ${company.id}: ${company.name}`);
  });
}

testSearch().catch(console.error);