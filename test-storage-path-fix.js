/**
 * storage_path修正確認テスト
 * Edge Functionが期待する形式でデータを取得できるか確認
 */

const https = require('https');

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

async function testFix() {
    console.log('\n══════════════════════════════════════════');
    console.log('  Storage Path 修正確認テスト');
    console.log('══════════════════════════════════════════\n');

    // テストする企業名（実際にデータベースに存在）
    const testCompanies = [
        '株式会社エル・ティー・エス',
        '株式会社多摩川ホールディングス',
        '株式会社ダイフク'
    ];

    console.log('【現在の問題】');
    console.log('  storage_path形式: FY2022/S100.../file.md');
    console.log('  期待される形式: markdown-files/FY2022/S100.../file.md');
    console.log('  → バケット名が欠落している\n');

    console.log('【テスト実行】');
    for (const company of testCompanies) {
        console.log(`\n🏢 ${company}`);

        try {
            const url = `${CONFIG.MARKDOWN_READER_URL}/by-company?name=${encodeURIComponent(company)}`;
            const response = await request(url, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.ANON_KEY}`
                }
            });

            console.log(`  ステータス: ${response.status}`);

            if (response.status === 200) {
                console.log(`  ✅ データ取得成功！`);
                console.log(`  サイズ: ${response.data.length.toLocaleString()}文字`);
                console.log(`  → Edge Functionが修正されている可能性があります`);
            } else if (response.status === 500) {
                const error = response.data;
                if (error.includes('Download failed')) {
                    console.log(`  ❌ Download failed エラー（未修正）`);
                    console.log(`  → Edge Functionの修正が必要です`);
                } else {
                    console.log(`  ❌ その他のエラー: ${error}`);
                }
            } else if (response.status === 404) {
                console.log(`  ⚠️ データが見つかりません`);
            } else {
                console.log(`  ❓ 予期しないステータス: ${response.data}`);
            }

        } catch (error) {
            console.log(`  💥 接続エラー: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n【修正方法】');
    console.log('');
    console.log('方法1: Edge Function内でバケット名を自動追加（推奨）');
    console.log('  → markdown-readerのコードを修正');
    console.log('  → const bucket = "markdown-files";');
    console.log('  → const objectPath = storage_path;');
    console.log('');
    console.log('方法2: データベースのstorage_pathを一括更新');
    console.log('  → UPDATE markdown_files_metadata');
    console.log('  → SET storage_path = "markdown-files/" || storage_path');
    console.log('  → WHERE storage_path NOT LIKE "markdown-files/%"');
    console.log('');
}

// 実行
testFix().catch(console.error);