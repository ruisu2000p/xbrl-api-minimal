/**
 * Edge Function直接テスト
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt';

async function test() {
    console.log('🔐 Edge Function直接テスト\n');
    
    // Authorizationヘッダーでテスト
    try {
        const response = await fetch(GATEWAY_URL, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        
        console.log('ステータス:', response.status);
        const text = await response.text();
        console.log('レスポンス:', text);
    } catch (error) {
        console.error('エラー:', error.message);
    }
}

test();
