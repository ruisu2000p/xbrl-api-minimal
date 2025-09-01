// クスリのアオキ関連企業を詳細検索
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.wpwqxhyiglbtlaimrjrx' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchKusuri() {
  console.log('=== クスリのアオキ関連企業の詳細検索 ===\n');

  // 1. IDでの直接検索
  console.log('1. CSVに記載されていたIDで検索:');
  const ids = ['S1008IOS', 'S100U8R6', 'S100RPQ6', 'S100P1U4', 'S100MB7M', 'S100GSR7'];
  
  for (const id of ids) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, description')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.log(`  ${id}: エラー - ${error.message}`);
    } else if (data) {
      console.log(`  ${id}: ${data.name}`);
    } else {
      console.log(`  ${id}: 見つかりません`);
    }
  }
  console.log();

  // 2. 部分一致検索（様々なパターン）
  console.log('2. 様々なパターンで部分一致検索:');
  const patterns = ['クスリ', 'アオキ', 'kusuri', 'aoki', 'AOKI'];
  
  for (const pattern of patterns) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', `%${pattern}%`)
      .limit(5);
    
    if (error) {
      console.log(`  "${pattern}": エラー - ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`  "${pattern}": ${data.length}件`);
      data.forEach(company => {
        console.log(`    - ${company.id}: ${company.name}`);
      });
    } else {
      console.log(`  "${pattern}": 見つかりません`);
    }
  }
  console.log();

  // 3. 全データをスキャンして「クスリ」を含む企業を探す
  console.log('3. 全データスキャン（5000件ずつ）:');
  let allKusuriCompanies = [];
  let offset = 0;
  const limit = 5000;
  
  while (offset < 10000) {  // 最大10000件まで
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.log(`  エラー（オフセット ${offset}）: ${error.message}`);
      break;
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    const filtered = data.filter(c => 
      c.name && (c.name.includes('クスリ') || c.name.includes('アオキ'))
    );
    
    if (filtered.length > 0) {
      console.log(`  オフセット ${offset}-${offset + data.length}: ${filtered.length}件発見`);
      allKusuriCompanies = allKusuriCompanies.concat(filtered);
    }
    
    offset += limit;
  }
  
  console.log(`\n合計: ${allKusuriCompanies.length}件のクスリ/アオキ関連企業`);
  allKusuriCompanies.forEach(company => {
    console.log(`  - ${company.id}: ${company.name}`);
  });
}

searchKusuri().catch(console.error);