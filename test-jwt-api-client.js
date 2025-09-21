/**
 * JWT APIゲートウェイのクライアントテスト
 * 独自APIキーのみを使用（anon key不要）
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// テスト用APIキー
const API_KEYS = {
    'key1': 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d',
    'key2': 'xbrl_v1_8b46fafbde00356ab72577e9eeba2709'
};

// Edge Function URL
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway-jwt';

/**
 * APIキーのみでアクセスするテスト
 */
async function testWithAPIKeyOnly(apiKey, keyName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔐 ${keyName} のテスト（anon key不要）`);
    console.log('APIキー:', apiKey.substring(0, 30) + '...');
    console.log('=' .repeat(60));

    // 1. エンドポイント一覧取得
    console.log('\n📋 エンドポイント一覧取得');
    try {
        const response = await fetch(GATEWAY_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,  // APIキーを直接Bearerトークンとして使用
                'Content-Type': 'application/json'
            }
        });

        console.log('ステータス:', response.status);
        const data = await response.json();

        if (response.status === 200) {
            console.log('✅ 認証成功');
            console.log('ティア:', data.tier);
            console.log('ロール:', data.role);
            console.log('エンドポイント:');
            data.endpoints?.forEach(ep => {
                console.log(`  - ${ep.method} ${ep.path}: ${ep.description}`);
                if (ep.params) {
                    console.log(`    パラメータ: ${ep.params.join(', ')}`);
                }
            });
        } else {
            console.error('❌ エラー:', data.error);
            return false;
        }
    } catch (error) {
        console.error('💥 エラー:', error.message);
        return false;
    }

    // 2. Markdownファイル検索
    console.log('\n🔍 Markdownファイル検索（トヨタ）');
    try {
        const response = await fetch(`${GATEWAY_URL}/markdown-files?search=トヨタ&limit=3`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        console.log('ステータス:', response.status);
        const data = await response.json();

        if (response.status === 200 && data.success) {
            console.log('✅ データ取得成功');
            console.log('件数:', data.count);

            if (data.data && data.data.length > 0) {
                console.log('\n検索結果:');
                data.data.forEach((file, i) => {
                    console.log(`${i + 1}. ${file.company_name || file.company_id}`);
                    console.log(`   年度: ${file.fiscal_year}`);
                    console.log(`   ファイルタイプ: ${file.file_type}`);
                    console.log(`   パス: ${file.storage_path}`);
                });

                // 最初のファイルをダウンロード
                const firstFile = data.data[0];
                await testDownload(apiKey, firstFile.storage_path);
            }
        } else {
            console.error('❌ エラー:', data.error || 'データ取得失敗');
        }
    } catch (error) {
        console.error('💥 エラー:', error.message);
    }

    // 3. 年度別アクセステスト
    console.log('\n📅 年度別アクセステスト');
    const years = ['FY2022', 'FY2023', 'FY2024', 'FY2025'];

    for (const year of years) {
        try {
            const response = await fetch(
                `${GATEWAY_URL}/markdown-files?fiscal_year=${year}&limit=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    }
                }
            );

            const data = await response.json();
            const hasAccess = response.status === 200 && data.success && data.count > 0;
            console.log(`${year}: ${hasAccess ? '✅ アクセス可能' : '⚠️ データなしまたはアクセス不可'}`);
        } catch (error) {
            console.log(`${year}: ❌ エラー`);
        }
    }

    return true;
}

/**
 * ファイルダウンロードテスト
 */
async function testDownload(apiKey, storagePath) {
    console.log('\n📥 ファイルダウンロードテスト');
    console.log('対象:', storagePath);

    try {
        const response = await fetch(
            `${GATEWAY_URL}/download?path=${encodeURIComponent(storagePath)}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        console.log('ステータス:', response.status);

        if (response.status === 200) {
            const content = await response.text();
            console.log('✅ ダウンロード成功');
            console.log('サイズ:', content.length, 'バイト');
            console.log('最初の150文字:');
            console.log(content.substring(0, 150) + '...');
        } else {
            const error = await response.json();
            console.log('❌ ダウンロード失敗:', error.error);
        }
    } catch (error) {
        console.error('💥 エラー:', error.message);
    }
}

/**
 * 無効なAPIキーでのテスト
 */
async function testInvalidAPIKey() {
    console.log('\n' + '='.repeat(60));
    console.log('🚫 無効なAPIキーでのテスト');
    console.log('=' .repeat(60));

    const invalidKeys = [
        'invalid_key_12345',
        'xbrl_v1_invalid1234567890123456789012345678',
        '',
        null
    ];

    for (const invalidKey of invalidKeys) {
        console.log(`\nテストキー: ${invalidKey || '(空)'}`);

        try {
            const response = await fetch(GATEWAY_URL, {
                headers: {
                    'Authorization': invalidKey ? `Bearer ${invalidKey}` : ''
                }
            });

            console.log('ステータス:', response.status);

            if (response.status === 401) {
                const data = await response.json();
                console.log('✅ 正しく拒否されました:', data.error);
            } else {
                console.log('❌ 予期しないステータスコード');
            }
        } catch (error) {
            console.log('💥 エラー:', error.message);
        }
    }
}

/**
 * パフォーマンステスト
 */
async function performanceTest(apiKey) {
    console.log('\n' + '='.repeat(60));
    console.log('⚡ パフォーマンステスト');
    console.log('=' .repeat(60));

    const iterations = 5;
    const times = [];

    console.log(`\n${iterations}回のAPI呼び出しを実行...`);

    for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        const response = await fetch(GATEWAY_URL, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        await response.json();
        const elapsed = Date.now() - start;
        times.push(elapsed);

        console.log(`  ${i + 1}回目: ${elapsed}ms`);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log('\n結果:');
    console.log(`  平均: ${avg.toFixed(2)}ms`);
    console.log(`  最小: ${min}ms`);
    console.log(`  最大: ${max}ms`);
}

/**
 * メイン実行
 */
async function main() {
    console.log('🚀 JWT APIゲートウェイ クライアントテスト');
    console.log('（anon key不要の独自APIキーシステム）\n');

    // 各APIキーでテスト
    for (const [keyName, apiKey] of Object.entries(API_KEYS)) {
        const success = await testWithAPIKeyOnly(apiKey, keyName);

        if (success && keyName === 'key1') {
            // パフォーマンステスト（最初のキーのみ）
            await performanceTest(apiKey);
        }
    }

    // 無効なAPIキーでのテスト
    await testInvalidAPIKey();

    console.log('\n' + '='.repeat(60));
    console.log('✨ すべてのテストが完了しました');
    console.log('💡 このシステムはanon keyなしで動作します');
    console.log('=' .repeat(60));
}

// 実行
main().catch(err => {
    console.error('テスト失敗:', err);
    process.exit(1);
});