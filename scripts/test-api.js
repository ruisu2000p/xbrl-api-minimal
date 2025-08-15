require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAPI() {
  console.log('===========================================');
  console.log('XBRL財務データAPI 動作確認');
  console.log('===========================================');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');

  try {
    // 1. 企業数の確認
    console.log('📊 1. データベース統計');
    console.log('------------------------');
    
    const { count: companyCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ 企業数: ${companyCount}社`);
    
    const { count: reportCount } = await supabase
      .from('financial_reports')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ レポート数: ${reportCount}件`);
    console.log('');

    // 2. サンプル企業の取得
    console.log('🏢 2. サンプル企業（最初の5社）');
    console.log('------------------------');
    
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, ticker')
      .limit(5);
    
    if (companiesError) throw companiesError;
    
    companies.forEach(company => {
      console.log(`- ${company.id}: ${company.name} (${company.ticker || 'N/A'})`);
    });
    console.log('');

    // 3. トヨタ（7203）のデータ確認
    console.log('🚗 3. 特定企業のデータ確認（トヨタ: 7203）');
    console.log('------------------------');
    
    const { data: toyota, error: toyotaError } = await supabase
      .from('companies')
      .select(`
        *,
        financial_reports (
          fiscal_year,
          fiscal_period,
          doc_type,
          storage_path
        )
      `)
      .or('ticker.eq.7203,id.ilike.%7203%')
      .single();
    
    if (toyota) {
      console.log(`✅ 企業名: ${toyota.name}`);
      console.log(`✅ ティッカー: ${toyota.ticker || 'N/A'}`);
      console.log(`✅ レポート数: ${toyota.financial_reports?.length || 0}件`);
      
      if (toyota.financial_reports?.length > 0) {
        const latest = toyota.financial_reports[0];
        console.log(`✅ 最新レポート: ${latest.fiscal_year}年 (${latest.doc_type})`);
      }
    } else {
      console.log('❌ トヨタのデータが見つかりません');
    }
    console.log('');

    // 4. Storage内のファイル確認
    console.log('📁 4. Storageファイル確認');
    console.log('------------------------');
    
    const { data: files, error: filesError } = await supabase
      .storage
      .from('markdown-files')
      .list('2022', { limit: 5 });
    
    if (files && files.length > 0) {
      console.log(`✅ 2022年フォルダ内のファイル数: ${files.length}件`);
      files.forEach(file => {
        console.log(`  - ${file.name}`);
      });
    } else {
      console.log('❌ Storageにファイルが見つかりません');
    }
    console.log('');

    // 5. APIエンドポイントのテスト（ローカル）
    console.log('🔌 5. APIエンドポイントテスト');
    console.log('------------------------');
    
    try {
      const response = await fetch('http://localhost:3000/api/v1/companies', {
        headers: {
          'X-API-Key': 'xbrl_test_key_123'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ GET /api/v1/companies: ${data.companies?.length || 0}社取得`);
      } else {
        console.log(`❌ APIエラー: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log('❌ APIに接続できません（サーバーが起動していない可能性）');
    }
    console.log('');

    // 6. メタデータ確認
    console.log('📋 6. メタデータ確認（オリジナルフォルダ名）');
    console.log('------------------------');
    
    const { data: reportsWithMeta, error: metaError } = await supabase
      .from('financial_reports')
      .select('company_id, metadata')
      .not('metadata', 'is', null)
      .limit(3);
    
    if (reportsWithMeta && reportsWithMeta.length > 0) {
      console.log(`✅ メタデータ付きレポート: ${reportsWithMeta.length}件`);
      reportsWithMeta.forEach(report => {
        if (report.metadata?.original_dir) {
          console.log(`  - ${report.company_id}: ${report.metadata.original_dir}`);
        }
      });
    }
    console.log('');

    console.log('===========================================');
    console.log('✅ 動作確認完了！');
    console.log('===========================================');
    console.log('');
    console.log('次のステップ:');
    console.log('1. Vercelでデプロイされた本番APIをテスト');
    console.log('2. フロントエンドからデータを表示');
    console.log('3. 検索機能の実装');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

// 実行
testAPI();