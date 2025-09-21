/**
 * デバッグ用Edge Functionテスト
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DEBUG_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/debug-jwt';

async function testDebugFunction() {
    console.log('🔧 デバッグ用Edge Functionテスト\n');

    try {
        const response = await fetch(DEBUG_URL, {
            headers: {
                'Authorization': 'Bearer test-token'
            }
        });

        const data = await response.json();

        console.log('ステータス:', response.status);
        console.log('レスポンス:');
        console.log(JSON.stringify(data, null, 2));

        // 環境変数の状況を分析
        if (data.debug?.environment) {
            const env = data.debug.environment;
            console.log('\n📊 環境変数分析:');
            console.log('- SUPABASE_URL:', env.supabaseUrl);
            console.log('- SERVICE_ROLE_KEY:', env.serviceRoleKey);
            console.log('- JWT_SECRET:', env.jwtSecret);
            console.log('- JWT_SECRET長さ:', env.jwtSecretLength);

            if (env.jwtSecret === 'NOT_SET') {
                console.log('\n❌ JWT_SECRET環境変数が設定されていません！');
                console.log('   → Supabaseダッシュボードで設定を確認してください');
            } else {
                console.log('\n✅ 環境変数は正常に設定されています');
            }
        }

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

testDebugFunction();