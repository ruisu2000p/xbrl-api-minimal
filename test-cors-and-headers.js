/**
 * CORSとヘッダーのテスト
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt';

async function testCORS() {
    console.log('🔍 CORS＆ヘッダーテスト\n');

    // OPTIONSリクエスト
    console.log('1️⃣ OPTIONS リクエスト:');
    const optRes = await fetch(GATEWAY_URL, { method: 'OPTIONS' });
    console.log('   ステータス:', optRes.status);
    console.log('   CORS Headers:');
    console.log('   - Access-Control-Allow-Origin:', optRes.headers.get('access-control-allow-origin'));
    console.log('   - Access-Control-Allow-Headers:', optRes.headers.get('access-control-allow-headers'));
    console.log('   - Access-Control-Allow-Methods:', optRes.headers.get('access-control-allow-methods'));

    // デバッグリクエスト
    console.log('\n2️⃣ デバッグリクエスト:');
    const debugRes = await fetch(GATEWAY_URL + '?debug=true', {
        headers: {
            'Authorization': 'Bearer xbrl_v1_ead23e30246d88250fdf4423c1e1491d'
        }
    });
    const debugBody = await debugRes.text();
    console.log('   ステータス:', debugRes.status);
    console.log('   レスポンス:', debugBody);

    try {
        const json = JSON.parse(debugBody);
        if (json.debug) {
            console.log('   デバッグ詳細:', json.debug);
        }
    } catch {}
}

testCORS();