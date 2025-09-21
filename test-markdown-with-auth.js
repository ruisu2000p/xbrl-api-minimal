/**
 * markdown-reader Edge Function 認証付きテスト
 * Anon KeyとXBRL API Keyの両方でテスト
 */

const https = require('https');

// 設定
const CONFIG = {
    BASE_URL: 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/markdown-reader',
    // Supabase Anon Key（最新版を取得）
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQyNDcxMzAsImV4cCI6MjAzOTgyMzEzMH0.tVUl2rrDZa-y_nnz3f0mBdnwF8D4w3Vll8b-LouMCZE',
    // XBRL API Key（MCP設定から）
    XBRL_KEY: 'xbrl_live_v1_c9490cdd-798d-4f6d-b8af-d8417bad6cf4_DRiu6Iyj2SXT5XRwQwO43Ab2MbilYjtA'
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

async function testWithAuth(authType, authKey) {
    console.log(`\n════════════════════════════════════════`);
    console.log(`  ${authType} でのテスト`);
    console.log(`════════════════════════════════════════\n`);

    const testCompanies = ['Sony', 'トヨタ自動車', '任天堂'];
    const results = [];

    for (const company of testCompanies) {
        try {
            const url = `${CONFIG.BASE_URL}/by-company?name=${encodeURIComponent(company)}`;

            // 認証ヘッダーの設定
            const headers = {
                'Authorization': `Bearer ${authKey}`
            };

            console.log(`▶ 会社名: ${company}`);

            const response = await request(url, { headers });
            console.log(`  ステータス: ${response.status}`);

            if (response.status === 200) {
                console.log(`  ✅ 成功 - ${response.data.length}文字のデータを取得`);
                console.log(`  Content-Type: ${response.headers['content-type']}`);

                // Markdownコンテンツの最初の部分を表示
                const lines = response.data.split('\n').slice(0, 5);
                console.log('  最初の5行:');
                lines.forEach(line => {
                    console.log(`    ${line.substring(0, 80)}`);
                });

                results.push({
                    company,
                    success: true,
                    dataLength: response.data.length
                });
            } else if (response.status === 404) {
                console.log(`  ⚠️ データが見つかりません`);
                results.push({
                    company,
                    success: false,
                    reason: 'Not Found'
                });
            } else if (response.status === 401) {
                console.log(`  ❌ 認証エラー: ${response.data}`);
                results.push({
                    company,
                    success: false,
                    reason: 'Auth Error'
                });
            } else {
                console.log(`  ❌ エラー: ${response.data}`);
                results.push({
                    company,
                    success: false,
                    reason: `Status ${response.status}`
                });
            }

            console.log('');

            // レート制限対策
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.log(`  ❌ 接続エラー: ${error.message}`);
            results.push({
                company,
                success: false,
                reason: error.message
            });
            console.log('');
        }
    }

    return results;
}

async function runAllTests() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   markdown-reader 認証テストスイート          ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
    console.log('エンドポイント:', CONFIG.BASE_URL);
    console.log('実行時刻:', new Date().toLocaleString('ja-JP'));

    const allResults = [];

    // 1. Anon Keyでのテスト
    const anonResults = await testWithAuth('Anon Key', CONFIG.ANON_KEY);
    allResults.push({ auth: 'Anon Key', results: anonResults });

    // 2. XBRL API Keyでのテスト
    const xbrlResults = await testWithAuth('XBRL API Key', CONFIG.XBRL_KEY);
    allResults.push({ auth: 'XBRL API Key', results: xbrlResults });

    // 3. 認証なしでのテスト（比較用）
    console.log(`\n════════════════════════════════════════`);
    console.log(`  認証なしでのテスト（比較用）`);
    console.log(`════════════════════════════════════════\n`);

    try {
        const url = `${CONFIG.BASE_URL}/by-company?name=Test`;
        const response = await request(url);
        console.log(`ステータス: ${response.status}`);
        console.log(`レスポンス: ${response.data}`);
    } catch (error) {
        console.log(`エラー: ${error.message}`);
    }

    // 結果サマリー
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║              最終結果サマリー                 ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');

    allResults.forEach(({ auth, results }) => {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        const successRate = Math.round((successCount / totalCount) * 100);

        console.log(`【${auth}】`);
        console.log(`  テスト数: ${totalCount}`);
        console.log(`  成功: ${successCount}`);
        console.log(`  成功率: ${successRate}%`);

        if (successCount > 0) {
            console.log('  成功した会社:');
            results.filter(r => r.success).forEach(r => {
                console.log(`    • ${r.company} (${r.dataLength}文字)`);
            });
        }
        console.log('');
    });

    // 最適な認証方法の特定
    const bestAuth = allResults.reduce((best, current) => {
        const currentSuccess = current.results.filter(r => r.success).length;
        const bestSuccess = best.results.filter(r => r.success).length;
        return currentSuccess > bestSuccess ? current : best;
    });

    if (bestAuth.results.filter(r => r.success).length > 0) {
        console.log('🎉 推奨認証方法:', bestAuth.auth);
    } else {
        console.log('❌ すべての認証方法が失敗しました');
        console.log('\n対応案:');
        console.log('1. Supabaseダッシュボードから最新のAnon Keyを取得');
        console.log('2. Edge FunctionのRLS設定を確認');
        console.log('3. api_keysテーブルに有効なAPIキーが存在することを確認');
    }

    return allResults;
}

// 実行
if (require.main === module) {
    runAllTests()
        .then(results => {
            const hasSuccess = results.some(r =>
                r.results.some(res => res.success)
            );
            process.exit(hasSuccess ? 0 : 1);
        })
        .catch(error => {
            console.error('テスト実行エラー:', error);
            process.exit(1);
        });
}

module.exports = { runAllTests };