const { createClient } = require('@supabase/supabase-js');

// APIキーとURLの設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
// カスタムAPIキー（現在無効）
// const XBRL_API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';

// 正しいSupabase anon key
const XBRL_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

// Supabaseクライアントの初期化
const supabase = createClient(SUPABASE_URL, XBRL_API_KEY);

async function testApiKey() {
    console.log('🔍 APIキーのテストを開始...');
    console.log('URL:', SUPABASE_URL);
    console.log('API Key:', XBRL_API_KEY.substring(0, 20) + '...');

    try {
        // 1. markdown_files_metadataテーブルから最初の5件を取得
        console.log('\n📊 markdown_files_metadataテーブルをテスト中...');
        const { data: files, error: filesError } = await supabase
            .from('markdown_files_metadata')
            .select('fiscal_year, company_id, company_name, file_type')
            .limit(5);

        if (filesError) {
            console.error('❌ エラー:', filesError.message);
            console.error('詳細:', filesError);
        } else {
            console.log('✅ データ取得成功!');
            console.log('取得件数:', files ? files.length : 0);
            if (files && files.length > 0) {
                console.log('\n取得したデータ:');
                files.forEach((file, index) => {
                    console.log(`${index + 1}. ${file.fiscal_year} - ${file.company_name || file.company_id} (${file.file_type})`);
                });
            }
        }

        // 2. company_masterテーブルをテスト
        console.log('\n📊 company_masterテーブルをテスト中...');
        const { data: companies, error: companiesError } = await supabase
            .from('company_master')
            .select('doc_id, company_name')
            .limit(3);

        if (companiesError) {
            console.error('❌ エラー:', companiesError.message);
        } else {
            console.log('✅ 企業マスターデータ取得成功!');
            console.log('取得件数:', companies ? companies.length : 0);
        }

        // 3. ストレージのアクセステスト
        console.log('\n📦 ストレージアクセステスト中...');
        const { data: storageData, error: storageError } = await supabase
            .storage
            .from('markdown-files')
            .list('FY2024', {
                limit: 3,
                offset: 0
            });

        if (storageError) {
            console.error('❌ ストレージエラー:', storageError.message);
        } else {
            console.log('✅ ストレージアクセス成功!');
            console.log('ファイル数:', storageData ? storageData.length : 0);
        }

        // 4. APIキーの検証（api_keysテーブル）
        console.log('\n🔐 APIキーの検証中...');
        const { data: apiKeyData, error: apiKeyError } = await supabase
            .rpc('verify_api_key', {
                p_api_key: XBRL_API_KEY
            });

        if (apiKeyError) {
            console.error('⚠️  APIキー検証エラー:', apiKeyError.message);
            console.log('（これは正常です。カスタムAPIキーは別の方法で管理されています）');
        } else {
            console.log('✅ APIキー検証成功!');
        }

        console.log('\n========================================');
        console.log('📈 テスト結果サマリー:');
        console.log(`- Markdownメタデータ: ${!filesError ? '✅ アクセス可能' : '❌ アクセス不可'}`);
        console.log(`- 企業マスター: ${!companiesError ? '✅ アクセス可能' : '❌ アクセス不可'}`);
        console.log(`- ストレージ: ${!storageError ? '✅ アクセス可能' : '❌ アクセス不可'}`);
        console.log('========================================');

    } catch (error) {
        console.error('💥 予期しないエラー:', error);
    }
}

// テスト実行
testApiKey().then(() => {
    console.log('\n✨ テスト完了');
    process.exit(0);
}).catch(err => {
    console.error('❌ テスト失敗:', err);
    process.exit(1);
});