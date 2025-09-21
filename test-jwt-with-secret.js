/**
 * JWT Secret設定後のテスト
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt';

async function testAPI() {
    console.log('🔧 JWT API Gateway テスト\n');
    console.log('環境変数設定完了後のテスト');
    console.log('=' .repeat(60));

    try {
        // 1. ルートエンドポイント
        console.log('\n1️⃣ ルートエンドポイント:');
        const rootRes = await fetch(GATEWAY_URL, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        console.log(`   ステータス: ${rootRes.status}`);
        if (rootRes.ok) {
            const data = await rootRes.json();
            console.log('   レスポンス:', JSON.stringify(data, null, 2));
        } else {
            const error = await rootRes.text();
            console.log('   エラー:', error);
        }

        // 2. Markdownファイル検索
        console.log('\n2️⃣ Markdownファイル検索:');
        const searchRes = await fetch(`${GATEWAY_URL}/markdown-files?search=トヨタ`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        console.log(`   ステータス: ${searchRes.status}`);
        if (searchRes.ok) {
            const data = await searchRes.json();
            console.log('   検索結果:', data.files?.length || 0, '件');
            if (data.files?.length > 0) {
                console.log('   最初のファイル:', data.files[0].company_name);
            }
        } else {
            const error = await searchRes.text();
            console.log('   エラー:', error);
        }

        // 3. エラー詳細の確認
        if (!rootRes.ok || !searchRes.ok) {
            console.log('\n⚠️ エラー詳細:');
            console.log('   - JWT_SECRET環境変数が正しく設定されているか確認');
            console.log('   - SUPABASE_SERVICE_ROLE_KEY環境変数が正しく設定されているか確認');
            console.log('   - Edge Functionの再起動が必要かもしれません');
        } else {
            console.log('\n✅ JWT認証システムが正常に動作しています！');
            console.log('   - カスタムAPIキーのみで動作');
            console.log('   - Supabase anon key不要');
            console.log('   - JWT自動生成成功');
        }

    } catch (error) {
        console.error('\n❌ エラー:', error.message);
    }
}

testAPI();