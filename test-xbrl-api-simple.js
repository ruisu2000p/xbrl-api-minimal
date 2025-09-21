/**
 * XBRL API シンプルテスト
 * APIキー発行からデータアクセスまでの基本機能をテスト
 */

const https = require('https');

// 設定
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDI0NzEzMCwiZXhwIjoyMDM5ODIzMTMwfQ.0Mh2sI8M_Cd7Jrv4YL6dIQlMkLZ9PLrfWMo0-T_j1o0';
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple';
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';

// HTTPリクエスト
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
                        data: data ? JSON.parse(data) : null
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
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

async function runTest() {
    console.log('==========================================');
    console.log('XBRL API テスト開始');
    console.log('==========================================\n');

    try {
        // 1. Service Role Key確認
        console.log('1. Service Role Key検証...');
        const authCheck = await request(
            `${SUPABASE_URL}/rest/v1/api_keys?limit=1`,
            {
                method: 'GET',
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
                }
            }
        );
        console.log(`   ステータス: ${authCheck.status} ${authCheck.status === 200 ? '✅' : '❌'}`);

        // 2. 新規APIキー発行
        console.log('\n2. 新規APIキー発行...');
        const createKeyResponse = await request(
            `${SUPABASE_URL}/rest/v1/rpc/create_api_key`,
            {
                method: 'POST',
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    user_identifier: `test_${Date.now()}@example.com`,
                    tier: 'basic',
                    description: 'Test Key'
                }
            }
        );

        let testApiKey = null;
        if (createKeyResponse.status === 200) {
            testApiKey = createKeyResponse.data.api_key || createKeyResponse.data;
            console.log(`   APIキー: ${testApiKey.substring(0, 30)}... ✅`);
        } else {
            console.log(`   失敗: ${createKeyResponse.status} ❌`);
            console.log(`   詳細: ${JSON.stringify(createKeyResponse.data)}`);
            return;
        }

        // 3. APIキー認証テスト
        console.log('\n3. APIキー認証テスト...');
        const verifyResponse = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': testApiKey,
                'Content-Type': 'application/json'
            },
            body: { action: 'verify' }
        });
        console.log(`   ステータス: ${verifyResponse.status} ${verifyResponse.status === 200 ? '✅' : '❌'}`);
        if (verifyResponse.data) {
            console.log(`   ティア: ${verifyResponse.data.tier || 'unknown'}`);
        }

        // 4. データ取得テスト
        console.log('\n4. 企業データ取得テスト...');
        const companiesResponse = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': testApiKey,
                'Content-Type': 'application/json'
            },
            body: {
                action: 'getCompanies',
                params: { limit: 3 }
            }
        });
        console.log(`   ステータス: ${companiesResponse.status} ${companiesResponse.status === 200 ? '✅' : '❌'}`);
        if (Array.isArray(companiesResponse.data)) {
            console.log(`   取得件数: ${companiesResponse.data.length}件`);
            if (companiesResponse.data[0]) {
                console.log(`   例: ${companiesResponse.data[0].company_name || companiesResponse.data[0].company_id}`);
            }
        }

        // 5. 財務データ検索
        console.log('\n5. 財務データ検索テスト...');
        const searchResponse = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': testApiKey,
                'Content-Type': 'application/json'
            },
            body: {
                action: 'searchFinancialData',
                params: {
                    fiscal_year: 'FY2024',
                    limit: 2
                }
            }
        });
        console.log(`   ステータス: ${searchResponse.status} ${searchResponse.status === 200 ? '✅' : '❌'}`);
        if (searchResponse.data) {
            const count = Array.isArray(searchResponse.data) ?
                         searchResponse.data.length :
                         (searchResponse.data.data ? searchResponse.data.data.length : 0);
            console.log(`   取得件数: ${count}件`);
        }

        console.log('\n==========================================');
        console.log('テスト完了！');
        console.log('==========================================');

    } catch (error) {
        console.error('\nエラー:', error.message);
    }
}

// 実行
runTest();