const { createClient } = require('@supabase/supabase-js');

// APIキーとURLの設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const CUSTOM_API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

// Supabaseクライアントをanon keyで初期化（RPC呼び出し用）
const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testCustomApiKey() {
    console.log('🔍 カスタムAPIキーのテストを開始...');
    console.log('Custom API Key:', CUSTOM_API_KEY.substring(0, 20) + '...');

    try {
        // 1. APIキーの検証（verify_api_key_hash関数を使用）
        console.log('\n🔐 カスタムAPIキーの検証中...');
        const { data: isValid, error: verifyError } = await supabase
            .rpc('verify_api_key_hash', {
                api_key_param: CUSTOM_API_KEY
            });

        if (verifyError) {
            console.error('❌ APIキー検証エラー:', verifyError.message);

            // 関数が存在しない場合、代替方法でチェック
            console.log('\n📊 代替方法でAPIキーを確認中...');
            const keyHash = require('crypto')
                .createHash('sha256')
                .update(CUSTOM_API_KEY)
                .digest('hex');

            const { data: apiKeyData, error: queryError } = await supabase
                .from('api_keys')
                .select('id, tier, is_active, name, expires_at')
                .eq('key_hash', keyHash)
                .eq('is_active', true)
                .single();

            if (queryError) {
                console.error('❌ クエリエラー:', queryError.message);
            } else if (apiKeyData) {
                console.log('✅ APIキーが見つかりました！');
                console.log('  - 名前:', apiKeyData.name);
                console.log('  - ティア:', apiKeyData.tier);
                console.log('  - アクティブ:', apiKeyData.is_active);
                console.log('  - 有効期限:', new Date(apiKeyData.expires_at).toLocaleDateString());

                // APIキーを使用してデータアクセス
                await testDataAccess(apiKeyData);
            } else {
                console.log('❌ APIキーが見つかりません');
            }
        } else {
            console.log('✅ APIキー検証成功!', isValid ? 'Valid' : 'Invalid');
            if (isValid) {
                await testDataAccess();
            }
        }

    } catch (error) {
        console.error('💥 予期しないエラー:', error);
    }
}

async function testDataAccess(apiKeyInfo = null) {
    console.log('\n📊 データアクセステスト開始...');

    // カスタムヘッダーでAPIキーを送信
    const customHeaders = {
        'x-api-key': CUSTOM_API_KEY
    };

    // 新しいクライアントを作成（カスタムヘッダー付き）
    const supabaseWithApiKey = createClient(SUPABASE_URL, ANON_KEY, {
        global: {
            headers: customHeaders
        }
    });

    // 1. markdown_files_metadataテーブルから企業リストを取得
    console.log('\n📄 利用可能な企業のMarkdownファイルを検索中...');
    const { data: companies, error: companiesError } = await supabaseWithApiKey
        .from('markdown_files_metadata')
        .select('company_id, company_name, fiscal_year, file_type')
        .limit(10);

    if (companiesError) {
        console.error('❌ エラー:', companiesError.message);
    } else if (companies && companies.length > 0) {
        console.log('✅ 企業データ取得成功!');
        console.log('\n利用可能な企業:');

        // 企業ごとにグループ化
        const uniqueCompanies = {};
        companies.forEach(company => {
            const key = company.company_id;
            if (!uniqueCompanies[key]) {
                uniqueCompanies[key] = {
                    name: company.company_name,
                    years: new Set(),
                    types: new Set()
                };
            }
            uniqueCompanies[key].years.add(company.fiscal_year);
            uniqueCompanies[key].types.add(company.file_type);
        });

        Object.entries(uniqueCompanies).slice(0, 5).forEach(([id, info], index) => {
            console.log(`${index + 1}. ${info.name || id}`);
            console.log(`   - ID: ${id}`);
            console.log(`   - 年度: ${Array.from(info.years).join(', ')}`);
            console.log(`   - 文書タイプ: ${Array.from(info.types).join(', ')}`);
        });
    } else {
        console.log('⚠️ データが見つかりません');
    }

    // 2. 使用ログを記録（もし関数があれば）
    console.log('\n📝 使用ログを記録中...');
    if (apiKeyInfo) {
        const { error: logError } = await supabase
            .from('api_key_usage_logs')
            .insert({
                api_key_id: apiKeyInfo.id,
                endpoint: '/api/test',
                method: 'GET',
                status_code: 200,
                response_time_ms: 100,
                timestamp: new Date().toISOString()
            });

        if (logError) {
            console.error('⚠️ ログ記録エラー:', logError.message);
        } else {
            console.log('✅ 使用ログ記録完了');
        }
    }

    console.log('\n========================================');
    console.log('📈 カスタムAPIキーテスト結果:');
    console.log('- APIキー登録: ✅ 成功');
    console.log('- データアクセス: ' + (!companiesError ? '✅ 成功' : '❌ 失敗'));
    console.log('========================================');
}

// テスト実行
testCustomApiKey().then(() => {
    console.log('\n✨ テスト完了');
    process.exit(0);
}).catch(err => {
    console.error('❌ テスト失敗:', err);
    process.exit(1);
});