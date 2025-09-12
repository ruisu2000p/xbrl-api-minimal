// wpwqxhyiglbtlaimrjrxプロジェクトの検索機能をテスト
const { createClient } = require('@supabase/supabase-js');

// wpwqxhyiglbtlaimrjrxプロジェクトの設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.2SrZynFcQR3Sctenuar5jPHiORC4EFm7BDmW36imiDU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSearch() {
  console.log('=== wpwqxhyiglbtlaimrjrx プロジェクトテスト ===\n');
  console.log('URL:', SUPABASE_URL);
  console.log();

  try {
    // 1. テーブルの存在確認
    console.log('1. companiesテーブルの確認:');
    const { count, error: countError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('  エラー:', countError.message);
      if (countError.message.includes('relation') && countError.message.includes('does not exist')) {
        console.log('  → companiesテーブルが存在しません。作成が必要です。');
        return;
      }
    } else {
      console.log(`  総企業数: ${count}件`);
    }
    console.log();

    // 2. データサンプル取得
    console.log('2. 最初の5件のデータ:');
    const { data: sample, error: sampleError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(5);
    
    if (sampleError) {
      console.log('  エラー:', sampleError.message);
    } else if (sample && sample.length > 0) {
      sample.forEach(company => {
        console.log(`  - ${company.id}: ${company.name || '(名前なし)'}`);
      });
    } else {
      console.log('  データがありません');
    }
    console.log();

    // 3. クスリのアオキを検索
    console.log('3. 「クスリ」を含む企業を検索:');
    const { data: searchResult, error: searchError } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', '%クスリ%')
      .limit(10);
    
    if (searchError) {
      console.log('  エラー:', searchError.message);
    } else if (searchResult && searchResult.length > 0) {
      console.log(`  結果: ${searchResult.length}件`);
      searchResult.forEach(company => {
        console.log(`  - ${company.id}: ${company.name}`);
      });
    } else {
      console.log('  該当する企業が見つかりません');
    }
    console.log();

    // 4. アオキを検索
    console.log('4. 「アオキ」を含む企業を検索:');
    const { data: aokiResult, error: aokiError } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', '%アオキ%')
      .limit(10);
    
    if (aokiError) {
      console.log('  エラー:', aokiError.message);
    } else if (aokiResult && aokiResult.length > 0) {
      console.log(`  結果: ${aokiResult.length}件`);
      aokiResult.forEach(company => {
        console.log(`  - ${company.id}: ${company.name}`);
      });
    } else {
      console.log('  該当する企業が見つかりません');
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

testSearch().catch(console.error);