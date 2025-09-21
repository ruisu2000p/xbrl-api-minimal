/**
 * 詳細デバッグ用Edge Functionテスト
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt';

async function testEdgeFunctionDetailed() {
    console.log('🔍 詳細デバッグ用Edge Functionテスト\n');

    try {
        console.log('APIキー:', API_KEY);
        console.log('URL:', GATEWAY_URL);
        console.log('');

        const response = await fetch(GATEWAY_URL, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('ステータス:', response.status);
        console.log('ヘッダー:');
        for (const [key, value] of response.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }

        const responseText = await response.text();
        console.log('\nレスポンステキスト:', responseText);

        try {
            const jsonResponse = JSON.parse(responseText);
            console.log('\nJSONレスポンス:');
            console.log(JSON.stringify(jsonResponse, null, 2));

            if (jsonResponse.debugDetails) {
                console.log('\n🔧 デバッグ詳細:');
                console.log(JSON.stringify(jsonResponse.debugDetails, null, 2));
            }
        } catch (e) {
            console.log('JSONパースエラー:', e.message);
        }

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

testEdgeFunctionDetailed();