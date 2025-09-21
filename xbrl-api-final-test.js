/**
 * XBRL API 最終テストスイート
 * 最新のAnon Keyを使用してmarkdown-reader Edge Functionをテスト
 */

const https = require('https');

// 設定（最新のキー）
const CONFIG = {
    SUPABASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co',
    MARKDOWN_READER_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/markdown-reader',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs'
};

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
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║     XBRL API 最終テストスイート                  ║');
    console.log('║     markdown-reader Edge Function                ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log('【テスト環境】');
    console.log(`  URL: ${CONFIG.MARKDOWN_READER_URL}`);
    console.log(`  認証: Anon Key (最新版)`);
    console.log(`  実行時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log('');

    const testResults = [];

    // テスト1: 認証確認
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 テスト1: 認証確認');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        const url = `${CONFIG.MARKDOWN_READER_URL}/by-company?name=test`;
        const response = await request(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.ANON_KEY}`
            }
        });

        console.log(`  ステータスコード: ${response.status}`);

        if (response.status === 404) {
            console.log('  ✅ 認証成功（データなし）');
            testResults.push({ test: '認証確認', success: true });
        } else if (response.status === 200) {
            console.log('  ✅ 認証成功（データ取得）');
            testResults.push({ test: '認証確認', success: true });
        } else if (response.status === 401) {
            console.log('  ❌ 認証失敗:', response.data);
            testResults.push({ test: '認証確認', success: false });
        } else {
            console.log('  ⚠️ 予期しないレスポンス:', response.data);
            testResults.push({ test: '認証確認', success: false });
        }
    } catch (error) {
        console.log('  ❌ エラー:', error.message);
        testResults.push({ test: '認証確認', success: false });
    }
    console.log('');

    // テスト2: 実在する企業のデータ取得
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 テスト2: 企業データ取得');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testCompanies = [
        'トヨタ自動車',
        'ソニーグループ',
        '任天堂',
        '日本電信電話',
        'ソフトバンクグループ'
    ];

    for (const company of testCompanies) {
        try {
            const url = `${CONFIG.MARKDOWN_READER_URL}/by-company?name=${encodeURIComponent(company)}`;

            console.log(`\n  🏢 ${company}`);
            console.log(`  URL: ${url.substring(0, 80)}...`);

            const response = await request(url, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.ANON_KEY}`
                }
            });

            console.log(`  ステータス: ${response.status}`);

            if (response.status === 200) {
                const contentType = response.headers['content-type'];
                console.log(`  Content-Type: ${contentType}`);
                console.log(`  データサイズ: ${response.data.length.toLocaleString()}文字`);

                // Markdownの内容を確認
                if (contentType && contentType.includes('markdown')) {
                    const lines = response.data.split('\n').slice(0, 3);
                    console.log('  最初の3行:');
                    lines.forEach(line => {
                        const preview = line.substring(0, 60);
                        console.log(`    ${preview}${line.length > 60 ? '...' : ''}`);
                    });
                }

                console.log('  ✅ データ取得成功');
                testResults.push({
                    test: `企業データ: ${company}`,
                    success: true,
                    dataLength: response.data.length
                });
            } else if (response.status === 404) {
                console.log('  ⚠️ データが見つかりません');
                testResults.push({
                    test: `企業データ: ${company}`,
                    success: false,
                    reason: 'Not Found'
                });
            } else {
                console.log(`  ❌ エラー: ${response.data}`);
                testResults.push({
                    test: `企業データ: ${company}`,
                    success: false,
                    reason: response.data
                });
            }

            // レート制限対策
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.log(`  ❌ 接続エラー: ${error.message}`);
            testResults.push({
                test: `企業データ: ${company}`,
                success: false,
                reason: error.message
            });
        }
    }
    console.log('');

    // テスト3: エラーハンドリング
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 テスト3: エラーハンドリング');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 3-1: パラメータなし
    try {
        console.log('\n  📌 パラメータなしのリクエスト');
        const response = await request(`${CONFIG.MARKDOWN_READER_URL}/by-company`, {
            headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
        });
        console.log(`  ステータス: ${response.status}`);
        if (response.status === 400) {
            console.log('  ✅ 正しくエラー処理されました');
            testResults.push({ test: 'エラー処理: パラメータなし', success: true });
        } else {
            console.log('  ⚠️ 予期しないステータス');
            testResults.push({ test: 'エラー処理: パラメータなし', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        testResults.push({ test: 'エラー処理: パラメータなし', success: false });
    }

    // 3-2: 空の会社名
    try {
        console.log('\n  📌 空の会社名');
        const response = await request(`${CONFIG.MARKDOWN_READER_URL}/by-company?name=`, {
            headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
        });
        console.log(`  ステータス: ${response.status}`);
        if (response.status === 400 || response.status === 404) {
            console.log('  ✅ 正しくエラー処理されました');
            testResults.push({ test: 'エラー処理: 空の会社名', success: true });
        } else {
            console.log('  ⚠️ 予期しないステータス');
            testResults.push({ test: 'エラー処理: 空の会社名', success: false });
        }
    } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
        testResults.push({ test: 'エラー処理: 空の会社名', success: false });
    }

    console.log('');

    // 最終結果サマリー
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║              📊 テスト結果サマリー                ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');

    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    const successRate = Math.round((successCount / totalCount) * 100);

    // グループ別集計
    const authTests = testResults.filter(r => r.test.includes('認証'));
    const dataTests = testResults.filter(r => r.test.includes('企業データ'));
    const errorTests = testResults.filter(r => r.test.includes('エラー処理'));

    console.log('【カテゴリ別結果】');
    console.log(`  認証テスト: ${authTests.filter(r => r.success).length}/${authTests.length} 成功`);
    console.log(`  データ取得: ${dataTests.filter(r => r.success).length}/${dataTests.length} 成功`);
    console.log(`  エラー処理: ${errorTests.filter(r => r.success).length}/${errorTests.length} 成功`);

    console.log('');
    console.log('【詳細結果】');
    testResults.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const detail = result.dataLength ? ` (${result.dataLength.toLocaleString()}文字)` :
                      result.reason ? ` - ${result.reason}` : '';
        console.log(`  ${icon} ${result.test}${detail}`);
    });

    console.log('');
    console.log('【総合評価】');
    console.log(`  テスト合計: ${totalCount}件`);
    console.log(`  成功: ${successCount}件`);
    console.log(`  失敗: ${totalCount - successCount}件`);
    console.log(`  成功率: ${successRate}%`);

    // データ取得に成功した企業
    const successfulCompanies = testResults
        .filter(r => r.success && r.dataLength)
        .map(r => r.test.replace('企業データ: ', ''));

    if (successfulCompanies.length > 0) {
        console.log('');
        console.log('【✅ データ取得成功した企業】');
        successfulCompanies.forEach((company, i) => {
            const data = testResults.find(r => r.test === `企業データ: ${company}`);
            console.log(`  ${i + 1}. ${company} - ${data.dataLength.toLocaleString()}文字`);
        });
    }

    console.log('');
    if (successRate >= 80) {
        console.log('🎉 テスト成功！Edge Functionは正常に動作しています。');
    } else if (successRate >= 50) {
        console.log('⚠️ 一部のテストが成功しました。改善の余地があります。');
    } else {
        console.log('❌ 多くのテストが失敗しました。設定を確認してください。');
    }

    return testResults;
}

// 実行
if (require.main === module) {
    console.log('');
    console.log('🚀 XBRL API テストスイートを開始します...');

    runTests()
        .then(results => {
            const success = results.filter(r => r.success).length > 0;
            console.log('');
            console.log('✨ テスト完了');
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('');
            console.error('💥 テスト実行エラー:', error);
            process.exit(1);
        });
}

module.exports = { runTests };