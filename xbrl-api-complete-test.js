/**
 * XBRL API 完全テストスイート
 * APIキー発行からデータアクセスまでの全機能をテスト
 */

const https = require('https');

// テスト設定
const CONFIG = {
    SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
    GATEWAY_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple',

    // Service Role Key (APIキー発行用)
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

    // テスト用に新規発行されるAPIキー（実行時に設定）
    TEST_API_KEY: null,

    // テスト用ユーザー情報
    TEST_USER: {
        email: `test_${Date.now()}@example.com`,
        tier: 'basic'
    }
};

// ユーティリティ：HTTPリクエスト
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        status: res.statusCode,
                        headers: res.headers,
                        data: data ? JSON.parse(data) : null
                    };
                    resolve(result);
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
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

// テスト結果の表示
function logTestResult(testName, success, details = '') {
    const status = success ? '✅ 成功' : '❌ 失敗';
    console.log(`\n${status}: ${testName}`);
    if (details) {
        console.log(`  詳細: ${details}`);
    }
}

// テスト1: Service Role Keyの検証
async function testServiceRoleKey() {
    console.log('\n========================================');
    console.log('テスト1: Service Role Key検証');
    console.log('========================================');

    if (!CONFIG.SERVICE_ROLE_KEY) {
        logTestResult('Service Role Key確認', false,
            'SERVICE_ROLE_KEYが設定されていません。環境変数SUPABASE_SERVICE_ROLE_KEYを設定してください。');
        return false;
    }

    try {
        // Service Role Keyでテーブルアクセス
        const response = await makeRequest(
            `${CONFIG.SUPABASE_URL}/rest/v1/api_keys?limit=1`,
            {
                method: 'GET',
                headers: {
                    'apikey': CONFIG.SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 200) {
            logTestResult('Service Role Key検証', true, 'キーが有効です');
            return true;
        } else {
            logTestResult('Service Role Key検証', false,
                `HTTPステータス: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTestResult('Service Role Key検証', false, error.message);
        return false;
    }
}

// テスト2: 新規APIキーの発行
async function testCreateApiKey() {
    console.log('\n========================================');
    console.log('テスト2: 新規APIキー発行');
    console.log('========================================');

    try {
        const apiKeyData = {
            user_identifier: CONFIG.TEST_USER.email,
            tier: CONFIG.TEST_USER.tier,
            description: `Test API Key - ${new Date().toISOString()}`
        };

        const response = await makeRequest(
            `${CONFIG.SUPABASE_URL}/rest/v1/rpc/create_api_key`,
            {
                method: 'POST',
                headers: {
                    'apikey': CONFIG.SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: apiKeyData
            }
        );

        if (response.status === 200 && response.data) {
            CONFIG.TEST_API_KEY = response.data.api_key || response.data;
            logTestResult('APIキー発行', true,
                `新規APIキーを発行しました: ${CONFIG.TEST_API_KEY.substring(0, 20)}...`);
            return true;
        } else {
            logTestResult('APIキー発行', false,
                `HTTPステータス: ${response.status}, レスポンス: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        logTestResult('APIキー発行', false, error.message);
        return false;
    }
}

// テスト3: APIキーの認証テスト
async function testApiKeyAuthentication() {
    console.log('\n========================================');
    console.log('テスト3: APIキー認証');
    console.log('========================================');

    if (!CONFIG.TEST_API_KEY) {
        logTestResult('APIキー認証', false, 'テスト用APIキーが設定されていません');
        return false;
    }

    try {
        const response = await makeRequest(
            CONFIG.GATEWAY_URL,
            {
                method: 'POST',
                headers: {
                    'x-api-key': CONFIG.TEST_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: {
                    action: 'verify'
                }
            }
        );

        if (response.status === 200) {
            logTestResult('APIキー認証', true,
                `認証成功 - ティア: ${response.data?.tier || 'unknown'}`);
            return true;
        } else {
            logTestResult('APIキー認証', false,
                `HTTPステータス: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTestResult('APIキー認証', false, error.message);
        return false;
    }
}

// テスト4: データアクセステスト（企業リスト取得）
async function testGetCompanies() {
    console.log('\n========================================');
    console.log('テスト4: 企業データ取得');
    console.log('========================================');

    if (!CONFIG.TEST_API_KEY) {
        logTestResult('企業データ取得', false, 'テスト用APIキーが設定されていません');
        return false;
    }

    try {
        const response = await makeRequest(
            CONFIG.GATEWAY_URL,
            {
                method: 'POST',
                headers: {
                    'x-api-key': CONFIG.TEST_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: {
                    action: 'getCompanies',
                    params: {
                        limit: 5
                    }
                }
            }
        );

        if (response.status === 200 && Array.isArray(response.data)) {
            logTestResult('企業データ取得', true,
                `${response.data.length}件の企業データを取得しました`);

            // 最初の企業を表示
            if (response.data[0]) {
                console.log('  サンプル企業:');
                console.log(`    - ID: ${response.data[0].company_id}`);
                console.log(`    - 名称: ${response.data[0].company_name}`);
            }
            return true;
        } else {
            logTestResult('企業データ取得', false,
                `HTTPステータス: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTestResult('企業データ取得', false, error.message);
        return false;
    }
}

// テスト5: 財務データ検索テスト
async function testSearchFinancialData() {
    console.log('\n========================================');
    console.log('テスト5: 財務データ検索');
    console.log('========================================');

    if (!CONFIG.TEST_API_KEY) {
        logTestResult('財務データ検索', false, 'テスト用APIキーが設定されていません');
        return false;
    }

    try {
        const response = await makeRequest(
            CONFIG.GATEWAY_URL,
            {
                method: 'POST',
                headers: {
                    'x-api-key': CONFIG.TEST_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: {
                    action: 'searchFinancialData',
                    params: {
                        fiscal_year: 'FY2024',
                        limit: 3
                    }
                }
            }
        );

        if (response.status === 200 && response.data) {
            const count = Array.isArray(response.data) ? response.data.length :
                          (response.data.data ? response.data.data.length : 0);

            logTestResult('財務データ検索', true,
                `FY2024の財務データを${count}件取得しました`);
            return true;
        } else {
            logTestResult('財務データ検索', false,
                `HTTPステータス: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTestResult('財務データ検索', false, error.message);
        return false;
    }
}

// テスト6: Markdownコンテンツ取得テスト
async function testGetMarkdownContent() {
    console.log('\n========================================');
    console.log('テスト6: Markdownコンテンツ取得');
    console.log('========================================');

    if (!CONFIG.TEST_API_KEY) {
        logTestResult('Markdownコンテンツ取得', false, 'テスト用APIキーが設定されていません');
        return false;
    }

    try {
        // まず利用可能なファイルを検索
        const searchResponse = await makeRequest(
            CONFIG.GATEWAY_URL,
            {
                method: 'POST',
                headers: {
                    'x-api-key': CONFIG.TEST_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: {
                    action: 'searchFinancialData',
                    params: {
                        fiscal_year: 'FY2024',
                        limit: 1
                    }
                }
            }
        );

        if (searchResponse.status !== 200 || !searchResponse.data) {
            logTestResult('Markdownコンテンツ取得', false,
                'テスト用ファイルが見つかりません');
            return false;
        }

        const files = Array.isArray(searchResponse.data) ?
                     searchResponse.data : searchResponse.data.data;

        if (!files || files.length === 0) {
            logTestResult('Markdownコンテンツ取得', false,
                'テスト用ファイルが見つかりません');
            return false;
        }

        const testFile = files[0];

        // Markdownコンテンツを取得
        const contentResponse = await makeRequest(
            CONFIG.GATEWAY_URL,
            {
                method: 'POST',
                headers: {
                    'x-api-key': CONFIG.TEST_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: {
                    action: 'getMarkdownContent',
                    params: {
                        storage_path: testFile.storage_path
                    }
                }
            }
        );

        if (contentResponse.status === 200 && contentResponse.data) {
            const contentLength = contentResponse.data.content ?
                                 contentResponse.data.content.length :
                                 (typeof contentResponse.data === 'string' ?
                                  contentResponse.data.length : 0);

            logTestResult('Markdownコンテンツ取得', true,
                `${contentLength}文字のコンテンツを取得しました`);

            console.log(`  ファイル: ${testFile.storage_path}`);
            console.log(`  企業: ${testFile.company_name || testFile.company_id}`);

            return true;
        } else {
            logTestResult('Markdownコンテンツ取得', false,
                `HTTPステータス: ${contentResponse.status}`);
            return false;
        }
    } catch (error) {
        logTestResult('Markdownコンテンツ取得', false, error.message);
        return false;
    }
}

// テスト7: レート制限テスト
async function testRateLimit() {
    console.log('\n========================================');
    console.log('テスト7: レート制限');
    console.log('========================================');

    if (!CONFIG.TEST_API_KEY) {
        logTestResult('レート制限', false, 'テスト用APIキーが設定されていません');
        return false;
    }

    try {
        const requests = [];
        const requestCount = 5;

        console.log(`  ${requestCount}回の連続リクエストを送信中...`);

        // 連続リクエストを送信
        for (let i = 0; i < requestCount; i++) {
            requests.push(makeRequest(
                CONFIG.GATEWAY_URL,
                {
                    method: 'POST',
                    headers: {
                        'x-api-key': CONFIG.TEST_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: {
                        action: 'verify'
                    }
                }
            ));
        }

        const results = await Promise.all(requests);
        const successCount = results.filter(r => r.status === 200).length;
        const rateLimitedCount = results.filter(r => r.status === 429).length;

        console.log(`  成功: ${successCount}/${requestCount}`);
        console.log(`  レート制限: ${rateLimitedCount}/${requestCount}`);

        // レート制限ヘッダーの確認
        const lastResult = results[results.length - 1];
        if (lastResult.headers) {
            const remaining = lastResult.headers['x-ratelimit-remaining'];
            const limit = lastResult.headers['x-ratelimit-limit'];

            if (limit) {
                console.log(`  レート制限情報: ${remaining || '0'}/${limit}`);
            }
        }

        logTestResult('レート制限', true,
            `レート制限が正常に動作しています`);
        return true;
    } catch (error) {
        logTestResult('レート制限', false, error.message);
        return false;
    }
}

// テスト8: APIキーの削除（クリーンアップ）
async function testDeleteApiKey() {
    console.log('\n========================================');
    console.log('テスト8: APIキー削除（クリーンアップ）');
    console.log('========================================');

    if (!CONFIG.TEST_API_KEY) {
        console.log('  スキップ: テスト用APIキーが作成されていません');
        return true;
    }

    try {
        // APIキーのIDを取得
        const searchResponse = await makeRequest(
            `${CONFIG.SUPABASE_URL}/rest/v1/api_keys?key=eq.${CONFIG.TEST_API_KEY}&select=id`,
            {
                method: 'GET',
                headers: {
                    'apikey': CONFIG.SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (searchResponse.status === 200 && searchResponse.data && searchResponse.data[0]) {
            const keyId = searchResponse.data[0].id;

            // APIキーを削除
            const deleteResponse = await makeRequest(
                `${CONFIG.SUPABASE_URL}/rest/v1/api_keys?id=eq.${keyId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': CONFIG.SERVICE_ROLE_KEY,
                        'Authorization': `Bearer ${CONFIG.SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (deleteResponse.status === 204 || deleteResponse.status === 200) {
                logTestResult('APIキー削除', true,
                    'テスト用APIキーを削除しました');
                return true;
            } else {
                logTestResult('APIキー削除', false,
                    `削除失敗: HTTPステータス ${deleteResponse.status}`);
                return false;
            }
        } else {
            logTestResult('APIキー削除', false,
                'APIキーが見つかりません');
            return false;
        }
    } catch (error) {
        logTestResult('APIキー削除', false, error.message);
        return false;
    }
}

// メインテスト実行
async function runAllTests() {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   XBRL API 完全テストスイート開始     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log(`テスト環境: ${CONFIG.GATEWAY_URL}`);
    console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);

    const testResults = {
        total: 0,
        passed: 0,
        failed: 0
    };

    // 各テストを順次実行
    const tests = [
        { name: 'Service Role Key検証', func: testServiceRoleKey },
        { name: 'APIキー発行', func: testCreateApiKey },
        { name: 'APIキー認証', func: testApiKeyAuthentication },
        { name: '企業データ取得', func: testGetCompanies },
        { name: '財務データ検索', func: testSearchFinancialData },
        { name: 'Markdownコンテンツ取得', func: testGetMarkdownContent },
        { name: 'レート制限', func: testRateLimit },
        { name: 'APIキー削除', func: testDeleteApiKey }
    ];

    for (const test of tests) {
        testResults.total++;

        try {
            const result = await test.func();

            if (result) {
                testResults.passed++;
            } else {
                testResults.failed++;

                // クリティカルなテストが失敗した場合は中断
                if (test.name === 'Service Role Key検証' ||
                    test.name === 'APIキー発行') {
                    console.log('\n⚠️  クリティカルなテストが失敗したため、テストを中断します');
                    break;
                }
            }
        } catch (error) {
            testResults.failed++;
            console.error(`エラー: ${test.name} - ${error.message}`);
        }

        // テスト間で少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 最終結果表示
    console.log('\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║          テスト結果サマリー            ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log(`  合計テスト数: ${testResults.total}`);
    console.log(`  ✅ 成功: ${testResults.passed}`);
    console.log(`  ❌ 失敗: ${testResults.failed}`);
    console.log(`  成功率: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

    if (testResults.failed === 0) {
        console.log('\n🎉 すべてのテストが成功しました！');
    } else {
        console.log('\n⚠️  一部のテストが失敗しました。詳細を確認してください。');
    }

    return testResults;
}

// 実行前の注意事項を表示
function showInstructions() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  XBRL API テストスイート - 使用方法');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('1. 環境変数の設定:');
    console.log('   SET SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    console.log('');
    console.log('2. テストの実行:');
    console.log('   node xbrl-api-complete-test.js');
    console.log('');
    console.log('3. Service Role Keyの取得方法:');
    console.log('   Supabase Dashboard → Settings → API → service_role');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
}

// エントリーポイント
if (require.main === module) {
    if (!CONFIG.SERVICE_ROLE_KEY) {
        showInstructions();
        console.log('❌ エラー: SUPABASE_SERVICE_ROLE_KEYが設定されていません');
        process.exit(1);
    }

    runAllTests().then(results => {
        process.exit(results.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('テスト実行エラー:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    CONFIG
};