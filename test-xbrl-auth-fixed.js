/**
 * XBRL API 認証修正テスト
 * Authorizationヘッダーを正しく設定
 */

const https = require('https');

// 設定
const API_KEY = 'xbrl_live_v1_c9490cdd-798d-4f6d-b8af-d8417bad6cf4_DRiu6Iyj2SXT5XRwQwO43Ab2MbilYjtA';
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple';

function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const opts = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = https.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data ? JSON.parse(data) : null
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, data: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

async function testAuth() {
    console.log('=== XBRL API 認証テスト ===\n');

    // テスト1: x-api-keyヘッダー
    console.log('1. x-api-keyヘッダーでのテスト:');
    try {
        const response1 = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: { action: 'verify' }
        });
        console.log(`   ステータス: ${response1.status}`);
        console.log(`   レスポンス: ${JSON.stringify(response1.data)}\n`);
    } catch (error) {
        console.log(`   エラー: ${error.message}\n`);
    }

    // テスト2: Authorizationヘッダー（Bearer）
    console.log('2. Authorization Bearerヘッダーでのテスト:');
    try {
        const response2 = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: { action: 'verify' }
        });
        console.log(`   ステータス: ${response2.status}`);
        console.log(`   レスポンス: ${JSON.stringify(response2.data)}\n`);
    } catch (error) {
        console.log(`   エラー: ${error.message}\n`);
    }

    // テスト3: 両方のヘッダー
    console.log('3. 両方のヘッダーでのテスト:');
    try {
        const response3 = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: { action: 'verify' }
        });
        console.log(`   ステータス: ${response3.status}`);
        console.log(`   レスポンス: ${JSON.stringify(response3.data)}\n`);
    } catch (error) {
        console.log(`   エラー: ${error.message}\n`);
    }

    // テスト4: apikeyヘッダー（Supabase標準）
    console.log('4. apikeyヘッダーでのテスト:');
    try {
        const response4 = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            },
            body: { action: 'verify' }
        });
        console.log(`   ステータス: ${response4.status}`);
        console.log(`   レスポンス: ${JSON.stringify(response4.data)}\n`);
    } catch (error) {
        console.log(`   エラー: ${error.message}\n`);
    }

    // 成功したヘッダー形式でデータ取得テスト
    console.log('=== データアクセステスト ===\n');

    // 最も可能性の高い形式（Authorization Bearer）でテスト
    console.log('企業データ取得テスト:');
    try {
        const response = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: {
                action: 'getCompanies',
                params: { limit: 3 }
            }
        });
        console.log(`   ステータス: ${response.status}`);
        if (response.status === 200) {
            console.log(`   ✅ 成功！`);
            if (Array.isArray(response.data)) {
                console.log(`   取得件数: ${response.data.length}件`);
                response.data.forEach((company, i) => {
                    console.log(`   ${i + 1}. ${company.company_name || company.company_id}`);
                });
            }
        } else {
            console.log(`   ❌ 失敗: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        console.log(`   エラー: ${error.message}`);
    }
}

testAuth();