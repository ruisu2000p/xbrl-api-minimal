/**
 * Edge Functionのステータスと設定確認
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const FUNCTIONS = [
    'xbrl-api-gateway-jwt',
    'xbrl-api-gateway',
    'api-key-validator'
];

async function checkFunction(functionName) {
    const url = `https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/${functionName}`;

    console.log(`\n📌 ${functionName}`);
    console.log('-'.repeat(50));

    try {
        // OPTIONSリクエストでCORS確認
        const optionsRes = await fetch(url, { method: 'OPTIONS' });
        console.log(`OPTIONS: ${optionsRes.status}`);

        // GETリクエスト（認証なし）
        const getRes = await fetch(url, { method: 'GET' });
        console.log(`GET (no auth): ${getRes.status}`);

        if (getRes.status !== 404) {
            const text = await getRes.text();
            try {
                const json = JSON.parse(text);
                console.log('Response:', JSON.stringify(json, null, 2).substring(0, 200));
            } catch {
                console.log('Response text:', text.substring(0, 100));
            }
        }

        // APIキーでテスト
        const apiKey = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
        const authRes = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log(`GET (with API key): ${authRes.status}`);

    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

async function main() {
    console.log('🔍 Edge Functions状態確認');
    console.log('=' .repeat(60));

    for (const func of FUNCTIONS) {
        await checkFunction(func);
    }

    console.log('\n\n📊 サマリー');
    console.log('=' .repeat(60));
    console.log('• 404 = Function未デプロイ');
    console.log('• 401 = 認証必要（Function動作中）');
    console.log('• 500 = 内部エラー（環境変数未設定の可能性）');
    console.log('• 200 = 正常動作');
}

main().catch(console.error);