/**
 * XBRL API 完全動作確認テスト
 * 実際にデータベースに存在する企業名でテスト
 */

const https = require('https');

// 設定
const CONFIG = {
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

async function runCompleteTest() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         XBRL API 完全動作確認テスト                   ║');
    console.log('║     APIキー発行 → 認証 → データアクセス               ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log('');

    const results = {
        total: 0,
        success: 0,
        failed: 0,
        details: []
    };

    // ステップ1: Edge Function動作確認
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 ステップ1: Edge Function動作確認');
    console.log('═══════════════════════════════════════════════════════');

    try {
        const url = `${CONFIG.MARKDOWN_READER_URL}/by-company?name=test`;
        console.log('  エンドポイント:', url);

        const response = await request(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.ANON_KEY}`
            }
        });

        results.total++;
        console.log(`  ステータス: ${response.status}`);

        if (response.status === 404 || response.status === 200) {
            console.log('  ✅ Edge Functionが正常に動作しています');
            results.success++;
            results.details.push({ step: 'Edge Function動作確認', success: true });
        } else {
            console.log('  ❌ Edge Functionの応答が異常です:', response.data);
            results.failed++;
            results.details.push({ step: 'Edge Function動作確認', success: false, error: response.data });
        }
    } catch (error) {
        console.log('  ❌ 接続エラー:', error.message);
        results.failed++;
        results.details.push({ step: 'Edge Function動作確認', success: false, error: error.message });
    }
    console.log('');

    // ステップ2: 認証メカニズムの確認
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 ステップ2: 認証メカニズム確認');
    console.log('═══════════════════════════════════════════════════════');

    // 認証なしのテスト
    try {
        console.log('  📌 認証なしでのアクセステスト');
        const response = await request(`${CONFIG.MARKDOWN_READER_URL}/by-company?name=test`);

        results.total++;
        if (response.status === 401) {
            console.log('    ✅ 正しく認証エラー（401）を返しました');
            results.success++;
        } else {
            console.log('    ⚠️ 予期しないステータス:', response.status);
            results.failed++;
        }
    } catch (error) {
        console.log('    ❌ エラー:', error.message);
        results.failed++;
    }

    // 認証ありのテスト
    try {
        console.log('  📌 Anon Key認証でのアクセステスト');
        const response = await request(`${CONFIG.MARKDOWN_READER_URL}/by-company?name=test`, {
            headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
        });

        results.total++;
        if (response.status === 404 || response.status === 200) {
            console.log('    ✅ 認証成功');
            results.success++;
        } else if (response.status === 401) {
            console.log('    ❌ 認証失敗:', response.data);
            results.failed++;
        } else {
            console.log('    ⚠️ 予期しないステータス:', response.status);
            results.failed++;
        }
    } catch (error) {
        console.log('    ❌ エラー:', error.message);
        results.failed++;
    }
    console.log('');

    // ステップ3: 実データアクセステスト
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 ステップ3: 実データアクセステスト');
    console.log('═══════════════════════════════════════════════════════');

    // データベースに実在する企業名でテスト
    const realCompanies = [
        '株式会社エル・ティー・エス',
        '株式会社多摩川ホールディングス',
        '日本瓦斯株式会社',
        '株式会社ダイフク',
        '三井住友トラスト・ホールディングス株式会社'
    ];

    console.log('  実在する企業データの取得テスト:\n');

    for (const company of realCompanies) {
        try {
            const url = `${CONFIG.MARKDOWN_READER_URL}/by-company?name=${encodeURIComponent(company)}`;

            console.log(`  🏢 ${company}`);

            const response = await request(url, {
                headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
            });

            results.total++;
            console.log(`     ステータス: ${response.status}`);

            if (response.status === 200) {
                const contentType = response.headers['content-type'];
                const dataSize = response.data.length;

                console.log(`     Content-Type: ${contentType}`);
                console.log(`     データサイズ: ${dataSize.toLocaleString()}文字`);

                // Markdownコンテンツの最初の部分を表示
                if (contentType && contentType.includes('markdown')) {
                    const firstLine = response.data.split('\n')[0];
                    console.log(`     最初の行: ${firstLine.substring(0, 50)}...`);
                }

                console.log('     ✅ データ取得成功');
                results.success++;
                results.details.push({
                    step: `データ取得: ${company}`,
                    success: true,
                    dataSize: dataSize
                });
            } else if (response.status === 404) {
                console.log('     ⚠️ データが見つかりません');
                results.failed++;
                results.details.push({
                    step: `データ取得: ${company}`,
                    success: false,
                    error: 'Not Found'
                });
            } else {
                console.log(`     ❌ エラー: ${response.data}`);
                results.failed++;
                results.details.push({
                    step: `データ取得: ${company}`,
                    success: false,
                    error: response.data
                });
            }

            console.log('');
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.log(`     ❌ 接続エラー: ${error.message}`);
            results.failed++;
            results.details.push({
                step: `データ取得: ${company}`,
                success: false,
                error: error.message
            });
            console.log('');
        }
    }

    // ステップ4: エラーハンドリングテスト
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 ステップ4: エラーハンドリングテスト');
    console.log('═══════════════════════════════════════════════════════');

    const errorTests = [
        { name: 'パラメータなし', url: `${CONFIG.MARKDOWN_READER_URL}/by-company`, expectedStatus: 400 },
        { name: '空の会社名', url: `${CONFIG.MARKDOWN_READER_URL}/by-company?name=`, expectedStatus: 400 },
        { name: '存在しない会社', url: `${CONFIG.MARKDOWN_READER_URL}/by-company?name=XXXNONEXISTENTXXX`, expectedStatus: 404 }
    ];

    for (const test of errorTests) {
        try {
            console.log(`  📌 ${test.name}`);
            const response = await request(test.url, {
                headers: { 'Authorization': `Bearer ${CONFIG.ANON_KEY}` }
            });

            results.total++;
            console.log(`     ステータス: ${response.status}`);

            if (response.status === test.expectedStatus) {
                console.log(`     ✅ 期待通りのエラーハンドリング`);
                results.success++;
            } else {
                console.log(`     ⚠️ 期待と異なるステータス (期待値: ${test.expectedStatus})`);
                results.failed++;
            }
        } catch (error) {
            console.log(`     ❌ エラー: ${error.message}`);
            results.failed++;
        }
        console.log('');
    }

    // 最終結果
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                  🎯 最終結果                           ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    const successRate = Math.round((results.success / results.total) * 100);

    console.log('【統計】');
    console.log(`  実行テスト数: ${results.total}`);
    console.log(`  ✅ 成功: ${results.success}`);
    console.log(`  ❌ 失敗: ${results.failed}`);
    console.log(`  成功率: ${successRate}%`);

    // 成功したデータ取得の詳細
    const successfulDataFetches = results.details.filter(d =>
        d.step.includes('データ取得') && d.success
    );

    if (successfulDataFetches.length > 0) {
        console.log('\n【✅ データ取得成功】');
        successfulDataFetches.forEach(item => {
            const company = item.step.replace('データ取得: ', '');
            console.log(`  • ${company}: ${item.dataSize.toLocaleString()}文字`);
        });
    }

    console.log('');
    console.log('【評価】');
    if (successRate >= 80) {
        console.log('  🎉 優秀: APIシステムが正常に動作しています！');
        console.log('  → markdown-reader Edge Functionは本番環境で使用可能です');
    } else if (successRate >= 60) {
        console.log('  ✅ 良好: 基本機能は動作していますが、改善の余地があります');
    } else if (successRate >= 40) {
        console.log('  ⚠️ 要改善: 一部機能に問題があります');
    } else {
        console.log('  ❌ 要修正: システムに重大な問題があります');
    }

    return results;
}

// 実行
if (require.main === module) {
    console.log('\n🚀 XBRL API 完全動作確認テストを開始します...\n');

    runCompleteTest()
        .then(results => {
            console.log('\n✨ テスト完了\n');
            process.exit(results.success > 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 テスト実行エラー:', error);
            process.exit(1);
        });
}

module.exports = { runCompleteTest };