const fetch = require('node-fetch');

// テストするAPIキー
const API_KEYS = [
    'xbrl_v1_8b46fafbde00356ab72577e9eeba2709',  // MCP API Key
    'xbrl_v1_ead23e30246d88250fdf4423c1e1491d',  // Custom API Key
];

const EDGE_FUNCTION_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/verify-xbrl-api-key';

async function testApiKeyVerification() {
    console.log('🔍 Edge FunctionでAPIキー検証をテスト\n');
    console.log('エンドポイント:', EDGE_FUNCTION_URL);
    console.log('=' .repeat(60) + '\n');

    for (const apiKey of API_KEYS) {
        console.log(`📝 テスト中: ${apiKey.substring(0, 30)}...`);

        try {
            // x-api-keyヘッダーでテスト
            console.log('  方法1: x-api-key ヘッダー');
            const response1 = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            const data1 = await response1.json();
            console.log('    ステータス:', response1.status);
            console.log('    レスポンス:', JSON.stringify(data1, null, 2));

            // Authorizationヘッダーでもテスト
            console.log('\n  方法2: Authorization Bearer ヘッダー');
            const response2 = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const data2 = await response2.json();
            console.log('    ステータス:', response2.status);
            console.log('    レスポンス:', JSON.stringify(data2, null, 2));

            if (response1.status === 200 || response2.status === 200) {
                console.log('\n  ✅ APIキー検証成功！');
            } else {
                console.log('\n  ❌ APIキー検証失敗');
            }

        } catch (error) {
            console.error('  💥 エラー:', error.message);
        }

        console.log('\n' + '-'.repeat(60) + '\n');
    }

    // 無効なAPIキーもテスト
    console.log('📝 無効なAPIキーのテスト');
    try {
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'x-api-key': 'invalid_key_12345',
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('  ステータス:', response.status);
        console.log('  レスポンス:', JSON.stringify(data, null, 2));

        if (response.status === 401) {
            console.log('  ✅ 無効なキーは正しく拒否されました');
        }
    } catch (error) {
        console.error('  💥 エラー:', error.message);
    }
}

// node-fetchがない場合はインストール
try {
    require.resolve('node-fetch');
    testApiKeyVerification().then(() => {
        console.log('\n✨ テスト完了');
        process.exit(0);
    });
} catch(e) {
    console.log('📦 node-fetchをインストール中...');
    require('child_process').execSync('npm install node-fetch', {stdio: 'inherit'});
    testApiKeyVerification().then(() => {
        console.log('\n✨ テスト完了');
        process.exit(0);
    });
}