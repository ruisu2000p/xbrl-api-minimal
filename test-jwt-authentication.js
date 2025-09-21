/**
 * JWT認証システムのテスト
 * APIキーからJWTを生成し、Supabase APIに直接アクセスする
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { generateJWTFromAPIKey } = require('./generate-jwt-for-api-key.js');

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

// テストするAPIキー
const API_KEYS = {
    'ead23e30': 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d',
    '8b46fafb': 'xbrl_v1_8b46fafbde00356ab72577e9eeba2709'
};

/**
 * JWTを使用してSupabase REST APIにアクセス
 */
async function testJWTAccess(apiKey, keyName) {
    console.log(`\n🔐 ${keyName} のテスト`);
    console.log('APIキー:', apiKey.substring(0, 30) + '...');
    console.log('-'.repeat(60));

    // Step 1: APIキーからJWTを生成
    const jwtResult = await generateJWTFromAPIKey(apiKey);

    if (!jwtResult.success) {
        console.error('❌ JWT生成失敗:', jwtResult.error);
        return false;
    }

    const jwtToken = jwtResult.token;
    console.log('✅ JWT生成成功');
    console.log('ペイロード:', JSON.stringify(jwtResult.payload, null, 2));

    // Step 2: JWTを使用してREST APIにアクセス
    console.log('\n📊 markdown_files_metadataへのアクセステスト');

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/markdown_files_metadata?select=*&limit=5`,
            {
                method: 'GET',
                headers: {
                    'apikey': ANON_KEY,  // Supabase REST APIにはapikeyヘッダーが必要
                    'Authorization': `Bearer ${jwtToken}`,  // カスタムJWTで認証
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('HTTPステータス:', response.status);

        if (response.status === 200) {
            const data = await response.json();
            console.log('✅ データ取得成功');
            console.log('取得件数:', data.length);

            if (data.length > 0) {
                console.log('\n最初のレコード:');
                console.log('- 企業名:', data[0].company_name);
                console.log('- 年度:', data[0].fiscal_year);
                console.log('- ファイルタイプ:', data[0].file_type);
            }
            return true;
        } else {
            const error = await response.text();
            console.error('❌ アクセス失敗:', error);
            return false;
        }
    } catch (error) {
        console.error('💥 エラー:', error.message);
        return false;
    }
}

/**
 * ストレージアクセステスト
 */
async function testStorageAccess(apiKey) {
    console.log('\n📦 ストレージアクセステスト');
    console.log('-'.repeat(60));

    const jwtResult = await generateJWTFromAPIKey(apiKey);
    if (!jwtResult.success) {
        console.error('JWT生成失敗');
        return false;
    }

    try {
        // まずメタデータから1つファイルを取得
        const metaResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/markdown_files_metadata?select=storage_path&limit=1`,
            {
                headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${jwtResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (metaResponse.status !== 200) {
            console.error('メタデータ取得失敗');
            return false;
        }

        const metaData = await metaResponse.json();
        if (metaData.length === 0) {
            console.log('ファイルが見つかりません');
            return false;
        }

        const storagePath = metaData[0].storage_path;
        console.log('テストファイル:', storagePath);

        // ストレージからファイルをダウンロード
        const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/markdown-files/${storagePath}`;
        const storageResponse = await fetch(storageUrl, {
            headers: {
                'Authorization': `Bearer ${jwtResult.token}`
            }
        });

        console.log('ストレージレスポンス:', storageResponse.status);

        if (storageResponse.status === 200) {
            const content = await storageResponse.text();
            console.log('✅ ファイル取得成功');
            console.log('ファイルサイズ:', content.length, 'バイト');
            console.log('最初の100文字:', content.substring(0, 100) + '...');
            return true;
        } else {
            console.error('❌ ファイル取得失敗');
            return false;
        }
    } catch (error) {
        console.error('💥 エラー:', error.message);
        return false;
    }
}

/**
 * 権限テスト（ティアごとの制限確認）
 */
async function testTierRestrictions(apiKey) {
    console.log('\n🔒 ティア制限テスト');
    console.log('-'.repeat(60));

    const jwtResult = await generateJWTFromAPIKey(apiKey);
    if (!jwtResult.success) {
        return false;
    }

    const tier = jwtResult.payload.tier;
    console.log('ティア:', tier);
    console.log('ロール:', jwtResult.payload.role);

    // 年度別のデータアクセステスト
    const years = ['FY2022', 'FY2023', 'FY2024', 'FY2025'];

    for (const year of years) {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/markdown_files_metadata?fiscal_year=eq.${year}&limit=1`,
            {
                headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${jwtResult.token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await response.json();
        const hasAccess = response.status === 200 && Array.isArray(data);
        console.log(`${year}: ${hasAccess ? '✅ アクセス可能' : '❌ アクセス不可'}`);
    }

    return true;
}

/**
 * メインテスト関数
 */
async function runAllTests() {
    console.log('🚀 JWT認証システム総合テスト\n');
    console.log('=' .repeat(60));

    // 各APIキーでテスト
    for (const [keyName, apiKey] of Object.entries(API_KEYS)) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📌 APIキー: ${keyName}`);
        console.log('=' .repeat(60));

        // JWT生成とAPIアクセステスト
        const apiSuccess = await testJWTAccess(apiKey, keyName);

        if (apiSuccess) {
            // ストレージアクセステスト
            await testStorageAccess(apiKey);

            // ティア制限テスト
            await testTierRestrictions(apiKey);
        }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✨ テスト完了');
}

// 実行
runAllTests().catch(err => {
    console.error('テスト失敗:', err);
    process.exit(1);
});