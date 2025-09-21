/**
 * XBRL API データアクセステスト
 * 既存のAPIキーを使用してデータアクセス機能をテスト
 */

const https = require('https');

// 設定（MCP設定から取得）
const API_KEY = 'xbrl_live_v1_c9490cdd-798d-4f6d-b8af-d8417bad6cf4_DRiu6Iyj2SXT5XRwQwO43Ab2MbilYjtA';
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple';

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

// テスト実行
async function runTests() {
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   XBRL API データアクセステスト開始      ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');
    console.log(`APIキー: ${API_KEY.substring(0, 40)}...`);
    console.log(`エンドポイント: ${GATEWAY_URL}`);
    console.log('');

    const results = [];

    // 1. APIキー検証
    console.log('▶ テスト1: APIキー検証');
    console.log('─────────────────────────────');
    try {
        const response = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: { action: 'verify' }
        });

        console.log(`  ステータス: ${response.status}`);
        if (response.status === 200) {
            console.log(`  ✅ 認証成功`);
            if (response.data) {
                console.log(`  ティア: ${response.data.tier || 'unknown'}`);
                console.log(`  ユーザー: ${response.data.user_identifier || 'unknown'}`);
            }
            results.push({ test: 'APIキー検証', success: true });
        } else {
            console.log(`  ❌ 認証失敗`);
            console.log(`  エラー: ${JSON.stringify(response.data)}`);
            results.push({ test: 'APIキー検証', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        results.push({ test: 'APIキー検証', success: false });
    }

    // 2. 企業リスト取得
    console.log('\n▶ テスト2: 企業リスト取得');
    console.log('─────────────────────────────');
    try {
        const response = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: {
                action: 'getCompanies',
                params: { limit: 5 }
            }
        });

        console.log(`  ステータス: ${response.status}`);
        if (response.status === 200 && Array.isArray(response.data)) {
            console.log(`  ✅ 取得成功: ${response.data.length}件`);

            // サンプル表示
            response.data.slice(0, 3).forEach((company, i) => {
                console.log(`  ${i + 1}. ${company.company_name || company.company_id}`);
            });
            results.push({ test: '企業リスト取得', success: true });
        } else {
            console.log(`  ❌ 取得失敗`);
            console.log(`  エラー: ${JSON.stringify(response.data)}`);
            results.push({ test: '企業リスト取得', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        results.push({ test: '企業リスト取得', success: false });
    }

    // 3. 財務データ検索（年度指定）
    console.log('\n▶ テスト3: 財務データ検索（FY2024）');
    console.log('─────────────────────────────');
    try {
        const response = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: {
                action: 'searchFinancialData',
                params: {
                    fiscal_year: 'FY2024',
                    limit: 5
                }
            }
        });

        console.log(`  ステータス: ${response.status}`);
        if (response.status === 200) {
            const data = response.data?.data || response.data;
            if (Array.isArray(data)) {
                console.log(`  ✅ 取得成功: ${data.length}件`);

                // サンプル表示
                data.slice(0, 2).forEach((item, i) => {
                    console.log(`  ${i + 1}. ${item.company_name || item.company_id} - ${item.file_type}`);
                });
                results.push({ test: '財務データ検索', success: true });
            } else {
                console.log(`  ⚠️ データ形式が不正: ${typeof data}`);
                results.push({ test: '財務データ検索', success: false });
            }
        } else {
            console.log(`  ❌ 取得失敗`);
            console.log(`  エラー: ${JSON.stringify(response.data)}`);
            results.push({ test: '財務データ検索', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        results.push({ test: '財務データ検索', success: false });
    }

    // 4. 特定企業の検索
    console.log('\n▶ テスト4: 特定企業検索');
    console.log('─────────────────────────────');
    try {
        const response = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: {
                action: 'searchFinancialData',
                params: {
                    company_name: 'トヨタ',
                    limit: 3
                }
            }
        });

        console.log(`  ステータス: ${response.status}`);
        if (response.status === 200) {
            const data = response.data?.data || response.data;
            if (Array.isArray(data)) {
                console.log(`  ✅ 取得成功: ${data.length}件`);

                data.forEach((item, i) => {
                    console.log(`  ${i + 1}. ${item.fiscal_year} - ${item.company_name} - ${item.file_type}`);
                });
                results.push({ test: '特定企業検索', success: true });
            } else {
                console.log(`  ⚠️ 該当なし`);
                results.push({ test: '特定企業検索', success: true });
            }
        } else {
            console.log(`  ❌ 取得失敗`);
            results.push({ test: '特定企業検索', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        results.push({ test: '特定企業検索', success: false });
    }

    // 5. Markdownコンテンツ取得
    console.log('\n▶ テスト5: Markdownコンテンツ取得');
    console.log('─────────────────────────────');
    try {
        // まずファイルを検索
        const searchResponse = await request(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: {
                action: 'searchFinancialData',
                params: {
                    fiscal_year: 'FY2024',
                    limit: 1
                }
            }
        });

        if (searchResponse.status === 200) {
            const files = searchResponse.data?.data || searchResponse.data;
            if (Array.isArray(files) && files.length > 0) {
                const testFile = files[0];
                console.log(`  テストファイル: ${testFile.company_name} - ${testFile.file_type}`);

                // コンテンツ取得
                const contentResponse = await request(GATEWAY_URL, {
                    method: 'POST',
                    headers: {
                        'x-api-key': API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: {
                        action: 'getMarkdownContent',
                        params: {
                            storage_path: testFile.storage_path
                        }
                    }
                });

                if (contentResponse.status === 200) {
                    const content = contentResponse.data?.content || contentResponse.data;
                    const contentLength = typeof content === 'string' ? content.length : 0;
                    console.log(`  ✅ コンテンツ取得成功: ${contentLength}文字`);

                    // 最初の200文字を表示
                    if (contentLength > 0) {
                        const preview = content.substring(0, 200).replace(/\n/g, ' ');
                        console.log(`  プレビュー: ${preview}...`);
                    }
                    results.push({ test: 'Markdownコンテンツ取得', success: true });
                } else {
                    console.log(`  ❌ コンテンツ取得失敗`);
                    results.push({ test: 'Markdownコンテンツ取得', success: false });
                }
            } else {
                console.log(`  ⚠️ テスト用ファイルが見つかりません`);
                results.push({ test: 'Markdownコンテンツ取得', success: false });
            }
        } else {
            console.log(`  ❌ ファイル検索失敗`);
            results.push({ test: 'Markdownコンテンツ取得', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        results.push({ test: 'Markdownコンテンツ取得', success: false });
    }

    // 6. レート制限テスト
    console.log('\n▶ テスト6: レート制限確認');
    console.log('─────────────────────────────');
    try {
        const requests = [];
        const count = 3;

        console.log(`  ${count}回の連続リクエストを送信...`);

        for (let i = 0; i < count; i++) {
            requests.push(request(GATEWAY_URL, {
                method: 'POST',
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: { action: 'verify' }
            }));
        }

        const responses = await Promise.all(requests);
        const successCount = responses.filter(r => r.status === 200).length;
        const rateLimitedCount = responses.filter(r => r.status === 429).length;

        console.log(`  成功: ${successCount}/${count}`);
        if (rateLimitedCount > 0) {
            console.log(`  レート制限: ${rateLimitedCount}/${count}`);
        }

        // レート制限ヘッダーを確認
        const lastResponse = responses[responses.length - 1];
        if (lastResponse.headers) {
            const remaining = lastResponse.headers['x-ratelimit-remaining'];
            const limit = lastResponse.headers['x-ratelimit-limit'];
            if (limit) {
                console.log(`  レート制限: ${remaining || '0'}/${limit} 残り`);
            }
        }

        results.push({ test: 'レート制限確認', success: true });
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        results.push({ test: 'レート制限確認', success: false });
    }

    // 結果サマリー
    console.log('\n');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║            テスト結果サマリー             ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const successRate = Math.round((successCount / totalCount) * 100);

    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} ${result.test}`);
    });

    console.log('');
    console.log(`  合計: ${successCount}/${totalCount} 成功（${successRate}%）`);

    if (successCount === totalCount) {
        console.log('\n🎉 すべてのテストが成功しました！');
    } else {
        console.log('\n⚠️ 一部のテストが失敗しました');
    }
}

// 実行
runTests().catch(console.error);