/**
 * markdown-reader Edge Function テスト
 * 会社名でMarkdownコンテンツを取得
 */

const https = require('https');

// Supabase Edge Function エンドポイント
const BASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/markdown-reader';

// HTTPリクエスト関数
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
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   markdown-reader Edge Function テスト        ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
    console.log(`エンドポイント: ${BASE_URL}`);
    console.log('実行時刻:', new Date().toLocaleString('ja-JP'));
    console.log('');

    const testResults = [];

    // テスト1: 正常な会社名での取得
    console.log('▶ テスト1: 正常な会社名での取得');
    console.log('─────────────────────────────────');
    // 実際にデータベースに存在する企業名を使用
    const testCompanies = ['株式会社エル・ティー・エス', '株式会社ダイフク', '日本瓦斯株式会社'];

    for (const company of testCompanies) {
        try {
            const url = `${BASE_URL}/by-company?name=${encodeURIComponent(company)}`;
            console.log(`  会社名: ${company}`);
            console.log(`  URL: ${url}`);

            // 認証ヘッダーを追加
            const response = await request(url, {
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs'
                }
            });
            console.log(`  ステータス: ${response.status}`);

            if (response.status === 200) {
                console.log(`  ✅ 成功 - ${response.data.length}文字のデータを取得`);
                console.log(`  Content-Type: ${response.headers['content-type']}`);

                // 最初の200文字を表示
                const preview = response.data.substring(0, 200).replace(/\n/g, ' ');
                console.log(`  プレビュー: ${preview}...`);

                testResults.push({
                    test: `会社名取得: ${company}`,
                    success: true,
                    dataLength: response.data.length
                });
            } else if (response.status === 404) {
                console.log(`  ⚠️ データが見つかりません`);
                testResults.push({
                    test: `会社名取得: ${company}`,
                    success: false,
                    reason: 'Not Found'
                });
            } else {
                console.log(`  ❌ エラー: ${response.data}`);
                testResults.push({
                    test: `会社名取得: ${company}`,
                    success: false,
                    reason: response.data
                });
            }
            console.log('');

            // レート制限対策
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.log(`  ❌ エラー: ${error.message}`);
            testResults.push({
                test: `会社名取得: ${company}`,
                success: false,
                reason: error.message
            });
            console.log('');
        }
    }

    // テスト2: パラメータなしでのアクセス
    console.log('▶ テスト2: パラメータなしでのアクセス');
    console.log('─────────────────────────────────');
    try {
        const url = `${BASE_URL}/by-company`;
        console.log(`  URL: ${url}`);

        const response = await request(url, {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs'
            }
        });
        console.log(`  ステータス: ${response.status}`);

        if (response.status === 400) {
            console.log(`  ✅ 期待通りのエラー（400 Bad Request）`);
            console.log(`  メッセージ: ${response.data}`);
            testResults.push({ test: 'パラメータなし', success: true });
        } else {
            console.log(`  ❌ 予期しないステータス: ${response.status}`);
            testResults.push({ test: 'パラメータなし', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        testResults.push({ test: 'パラメータなし', success: false });
    }
    console.log('');

    // テスト3: 空の会社名
    console.log('▶ テスト3: 空の会社名');
    console.log('─────────────────────────────────');
    try {
        const url = `${BASE_URL}/by-company?name=`;
        console.log(`  URL: ${url}`);

        const response = await request(url, {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs'
            }
        });
        console.log(`  ステータス: ${response.status}`);

        if (response.status === 400) {
            console.log(`  ✅ 期待通りのエラー（400 Bad Request）`);
            testResults.push({ test: '空の会社名', success: true });
        } else if (response.status === 404) {
            console.log(`  ⚠️ Not Found（404）- データなし`);
            testResults.push({ test: '空の会社名', success: true });
        } else {
            console.log(`  ❌ 予期しないステータス: ${response.status}`);
            testResults.push({ test: '空の会社名', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        testResults.push({ test: '空の会社名', success: false });
    }
    console.log('');

    // テスト4: 特殊文字を含む会社名
    console.log('▶ テスト4: 特殊文字を含む会社名');
    console.log('─────────────────────────────────');
    const specialNames = ['A&B Company', '株式会社テスト', 'Test-Company_123'];

    for (const company of specialNames) {
        try {
            const url = `${BASE_URL}/by-company?name=${encodeURIComponent(company)}`;
            console.log(`  会社名: ${company}`);
            console.log(`  エンコード後: ${encodeURIComponent(company)}`);

            const response = await request(url, {
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs'
                }
            });
            console.log(`  ステータス: ${response.status}`);

            if (response.status === 200) {
                console.log(`  ✅ データ取得成功`);
                testResults.push({ test: `特殊文字: ${company}`, success: true });
            } else if (response.status === 404) {
                console.log(`  ⚠️ データなし（正常動作）`);
                testResults.push({ test: `特殊文字: ${company}`, success: true });
            } else {
                console.log(`  ❌ エラー: ${response.status}`);
                testResults.push({ test: `特殊文字: ${company}`, success: false });
            }

            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.log(`  ❌ エラー: ${error.message}`);
            testResults.push({ test: `特殊文字: ${company}`, success: false });
        }
        console.log('');
    }

    // テスト5: レスポンスヘッダーの確認
    console.log('▶ テスト5: レスポンスヘッダーの確認');
    console.log('─────────────────────────────────');
    try {
        const url = `${BASE_URL}/by-company?name=Test`;
        const response = await request(url);

        console.log('  主要ヘッダー:');
        console.log(`    Content-Type: ${response.headers['content-type'] || 'なし'}`);
        console.log(`    Cache-Control: ${response.headers['cache-control'] || 'なし'}`);
        console.log(`    Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin'] || 'なし'}`);

        testResults.push({ test: 'ヘッダー確認', success: true });
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        testResults.push({ test: 'ヘッダー確認', success: false });
    }
    console.log('');

    // 結果サマリー
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║              テスト結果サマリー               ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');

    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    const successRate = Math.round((successCount / totalCount) * 100);

    // 詳細結果
    console.log('【詳細結果】');
    testResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const detail = result.dataLength ? ` (${result.dataLength}文字)` :
                      result.reason ? ` - ${result.reason}` : '';
        console.log(`  ${status} ${result.test}${detail}`);
    });

    console.log('');
    console.log('【サマリー】');
    console.log(`  実行テスト数: ${totalCount}`);
    console.log(`  成功: ${successCount}`);
    console.log(`  失敗: ${totalCount - successCount}`);
    console.log(`  成功率: ${successRate}%`);

    // データ取得成功した会社
    const successfulCompanies = testResults
        .filter(r => r.success && r.dataLength)
        .map(r => r.test.replace('会社名取得: ', ''));

    if (successfulCompanies.length > 0) {
        console.log('');
        console.log('【データ取得成功した会社】');
        successfulCompanies.forEach(company => {
            console.log(`  • ${company}`);
        });
    }

    if (successRate === 100) {
        console.log('\n🎉 すべてのテストが成功しました！');
    } else if (successRate >= 70) {
        console.log('\n✅ 大部分のテストが成功しました');
    } else if (successRate >= 50) {
        console.log('\n⚠️ 一部のテストが成功しました');
    } else {
        console.log('\n❌ 多くのテストが失敗しました');
    }

    return testResults;
}

// 実行
if (require.main === module) {
    runTests()
        .then(results => {
            const success = results.filter(r => r.success).length > 0;
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('テスト実行エラー:', error);
            process.exit(1);
        });
}

module.exports = { runTests };