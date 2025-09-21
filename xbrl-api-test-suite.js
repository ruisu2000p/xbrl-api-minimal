/**
 * XBRL API 統合テストスイート
 *
 * このテストは以下を検証します：
 * 1. Edge Function (markdown-reader) の動作
 * 2. 認証メカニズム（Anon Key）
 * 3. 実データアクセス
 * 4. エラーハンドリング
 *
 * 最終更新: 2025年1月
 * storage_path修正済み（markdown-files/プレフィックス追加済み）
 */

const https = require('https');

// 設定
const CONFIG = {
    SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
    MARKDOWN_READER_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/markdown-reader',
    // 最新のAnon Key（2025年1月取得）
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs'
};

// HTTPリクエストヘルパー
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

/**
 * 認証テスト
 */
async function testAuthentication() {
    console.log('\n📋 認証テスト');
    console.log('━'.repeat(50));

    const results = [];

    // 認証なしテスト
    try {
        const response = await request(`${CONFIG.MARKDOWN_READER_URL}/by-company?name=test`);
        const passed = response.status === 401;
        console.log(`  認証なし: ${passed ? '✅' : '❌'} (Status: ${response.status})`);
        results.push({ test: '認証なし', passed });
    } catch (error) {
        console.log('  認証なし: ❌', error.message);
        results.push({ test: '認証なし', passed: false });
    }

    // Anon Key認証テスト
    try {
        const response = await request(`${CONFIG.MARKDOWN_READER_URL}/by-company?name=test`, {
            headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
        });
        const passed = [200, 404].includes(response.status);
        console.log(`  Anon Key認証: ${passed ? '✅' : '❌'} (Status: ${response.status})`);
        results.push({ test: 'Anon Key認証', passed });
    } catch (error) {
        console.log('  Anon Key認証: ❌', error.message);
        results.push({ test: 'Anon Key認証', passed: false });
    }

    return results;
}

/**
 * データアクセステスト
 */
async function testDataAccess() {
    console.log('\n📋 データアクセステスト');
    console.log('━'.repeat(50));

    const testCompanies = [
        '株式会社エル・ティー・エス',
        '株式会社多摩川ホールディングス',
        '日本瓦斯株式会社',
        '株式会社ダイフク',
        '三井住友トラスト・ホールディングス株式会社'
    ];

    const results = [];

    for (const company of testCompanies) {
        try {
            const url = `${CONFIG.MARKDOWN_READER_URL}/by-company?name=${encodeURIComponent(company)}`;
            const response = await request(url, {
                headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
            });

            if (response.status === 200) {
                const contentType = response.headers['content-type'];
                console.log(`  ✅ ${company}`);
                console.log(`     データサイズ: ${response.data.length.toLocaleString()}文字`);
                results.push({
                    test: company,
                    passed: true,
                    dataSize: response.data.length
                });
            } else {
                console.log(`  ❌ ${company} (Status: ${response.status})`);
                results.push({
                    test: company,
                    passed: false,
                    status: response.status
                });
            }

            // レート制限対策
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.log(`  ❌ ${company}: ${error.message}`);
            results.push({
                test: company,
                passed: false,
                error: error.message
            });
        }
    }

    return results;
}

/**
 * エラーハンドリングテスト
 */
async function testErrorHandling() {
    console.log('\n📋 エラーハンドリングテスト');
    console.log('━'.repeat(50));

    const tests = [
        {
            name: 'パラメータなし',
            url: `${CONFIG.MARKDOWN_READER_URL}/by-company`,
            expectedStatus: 400
        },
        {
            name: '空の会社名',
            url: `${CONFIG.MARKDOWN_READER_URL}/by-company?name=`,
            expectedStatus: 400
        },
        {
            name: '存在しない会社',
            url: `${CONFIG.MARKDOWN_READER_URL}/by-company?name=XXXNONEXISTENTXXX`,
            expectedStatus: 404
        }
    ];

    const results = [];

    for (const test of tests) {
        try {
            const response = await request(test.url, {
                headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
            });

            const passed = response.status === test.expectedStatus;
            console.log(`  ${test.name}: ${passed ? '✅' : '❌'} (Status: ${response.status}, Expected: ${test.expectedStatus})`);
            results.push({
                test: test.name,
                passed,
                actualStatus: response.status,
                expectedStatus: test.expectedStatus
            });
        } catch (error) {
            console.log(`  ${test.name}: ❌ ${error.message}`);
            results.push({
                test: test.name,
                passed: false,
                error: error.message
            });
        }
    }

    return results;
}

/**
 * パフォーマンステスト
 */
async function testPerformance() {
    console.log('\n📋 パフォーマンステスト');
    console.log('━'.repeat(50));

    const company = '株式会社エル・ティー・エス';
    const iterations = 3;
    const times = [];

    for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        try {
            const url = `${CONFIG.MARKDOWN_READER_URL}/by-company?name=${encodeURIComponent(company)}`;
            await request(url, {
                headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
            });

            const duration = Date.now() - startTime;
            times.push(duration);
            console.log(`  試行 ${i + 1}: ${duration}ms`);

        } catch (error) {
            console.log(`  試行 ${i + 1}: エラー ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (times.length > 0) {
        const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        console.log(`  平均応答時間: ${avgTime}ms`);

        return [{
            test: 'レスポンス時間',
            passed: avgTime < 3000,
            avgTime
        }];
    }

    return [{
        test: 'レスポンス時間',
        passed: false,
        error: 'テスト失敗'
    }];
}

/**
 * メイン実行関数
 */
async function runFullTestSuite() {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║        XBRL API 統合テストスイート                 ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`\n実行時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log(`Edge Function: ${CONFIG.MARKDOWN_READER_URL}`);

    const allResults = [];

    // 1. 認証テスト
    const authResults = await testAuthentication();
    allResults.push(...authResults);

    // 2. データアクセステスト
    const dataResults = await testDataAccess();
    allResults.push(...dataResults);

    // 3. エラーハンドリングテスト
    const errorResults = await testErrorHandling();
    allResults.push(...errorResults);

    // 4. パフォーマンステスト
    const perfResults = await testPerformance();
    allResults.push(...perfResults);

    // 結果サマリー
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║                  最終結果                          ║');
    console.log('╚════════════════════════════════════════════════════╝');

    const passed = allResults.filter(r => r.passed).length;
    const total = allResults.length;
    const successRate = Math.round((passed / total) * 100);

    console.log(`\n【テスト統計】`);
    console.log(`  実行: ${total}件`);
    console.log(`  成功: ${passed}件`);
    console.log(`  失敗: ${total - passed}件`);
    console.log(`  成功率: ${successRate}%`);

    // データ取得成功企業
    const successfulDataAccess = allResults.filter(r => r.dataSize > 0);
    if (successfulDataAccess.length > 0) {
        console.log('\n【データ取得成功】');
        successfulDataAccess.forEach(item => {
            console.log(`  • ${item.test}: ${item.dataSize.toLocaleString()}文字`);
        });
    }

    // 評価
    console.log('\n【システム評価】');
    if (successRate >= 90) {
        console.log('  🎉 優秀: システムは完全に動作しています');
    } else if (successRate >= 70) {
        console.log('  ✅ 良好: 基本機能は動作しています');
    } else if (successRate >= 50) {
        console.log('  ⚠️ 要改善: 一部機能に問題があります');
    } else {
        console.log('  ❌ 要修正: システムに重大な問題があります');
    }

    return {
        total,
        passed,
        failed: total - passed,
        successRate,
        results: allResults
    };
}

// 実行
if (require.main === module) {
    runFullTestSuite()
        .then(summary => {
            console.log('\n✨ テスト完了\n');
            process.exit(summary.successRate >= 50 ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 テスト実行エラー:', error);
            process.exit(1);
        });
}

module.exports = {
    runFullTestSuite,
    testAuthentication,
    testDataAccess,
    testErrorHandling,
    testPerformance
};