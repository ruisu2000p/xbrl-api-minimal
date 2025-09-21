/**
 * 正しいエンドポイントでのテスト
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 正しいエンドポイント
const CORRECT_ENDPOINT = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt';
const API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';

async function testCorrectEndpoint() {
    console.log('🎯 正しいエンドポイントでのテスト\n');

    // 1. ルートエンドポイント
    console.log('1️⃣ ルートエンドポイント:');
    try {
        const rootResponse = await fetch(CORRECT_ENDPOINT, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('   ステータス:', rootResponse.status);
        const rootBody = await rootResponse.text();
        console.log('   レスポンス:', rootBody);

        if (rootResponse.ok) {
            const json = JSON.parse(rootBody);
            console.log('   エンドポイント一覧:', json.endpoints);
        }
    } catch (error) {
        console.error('   エラー:', error.message);
    }

    console.log('');

    // 2. Markdownファイル検索
    console.log('2️⃣ Markdownファイル検索:');
    try {
        const searchResponse = await fetch(`${CORRECT_ENDPOINT}/markdown-files?limit=5&search=トヨタ`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('   ステータス:', searchResponse.status);
        const searchBody = await searchResponse.text();
        console.log('   レスポンス:', searchBody.substring(0, 200) + '...');

        if (searchResponse.ok) {
            const json = JSON.parse(searchBody);
            console.log('   検索結果件数:', json.count || 0);
        }
    } catch (error) {
        console.error('   エラー:', error.message);
    }

    console.log('\n📋 正しいエンドポイント情報:');
    console.log('   ベースURL:', CORRECT_ENDPOINT);
    console.log('   エンドポイント:');
    console.log('   - GET  / (ルート - エンドポイント一覧)');
    console.log('   - GET  /markdown-files (ファイル検索)');
    console.log('   - GET  /download (ファイルダウンロード)');
    console.log('');
    console.log('🔑 認証方法:');
    console.log('   Header: Authorization: Bearer xbrl_v1_xxxxx...');
}

testCorrectEndpoint();