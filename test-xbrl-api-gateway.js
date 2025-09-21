// node-fetchの古いバージョンを使用している可能性があるため修正
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// カスタムAPIキー（anon keyは使用しない）
const API_KEY = 'xbrl_v1_ead23e30246d88250fdf4423c1e1491d';
const GATEWAY_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/xbrl-api-gateway';

async function testAPIGateway() {
    console.log('🔐 XBRL API Gateway テスト（カスタムAPIキーのみ使用）\n');
    console.log('エンドポイント:', GATEWAY_URL);
    console.log('APIキー:', API_KEY.substring(0, 30) + '...');
    console.log('=' .repeat(60) + '\n');

    // 1. エンドポイント一覧を取得
    console.log('📋 利用可能なエンドポイント');
    try {
        const response = await fetch(GATEWAY_URL, {
            method: 'GET',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('ステータス:', response.status);

        if (response.status === 200) {
            console.log('✅ 認証成功');
            console.log('ティア:', data.tier);
            console.log('\nエンドポイント:');
            data.endpoints?.forEach(ep => {
                console.log(`  - ${ep.path}: ${ep.description}`);
            });
        } else {
            console.log('❌ エラー:', data.error);
        }
    } catch (error) {
        console.error('💥 エラー:', error.message);
    }

    console.log('\n' + '-'.repeat(60) + '\n');

    // 2. Markdownファイル検索
    console.log('🔍 Markdownファイル検索（トヨタ）');
    try {
        const response = await fetch(`${GATEWAY_URL}/markdown-files?search=トヨタ&limit=5`, {
            method: 'GET',
            headers: {
                'x-api-key': API_KEY
            }
        });

        const data = await response.json();
        console.log('ステータス:', response.status);

        if (response.status === 200) {
            console.log('✅ データ取得成功');
            console.log('件数:', data.count);

            if (data.data && data.data.length > 0) {
                console.log('\n検索結果:');
                data.data.forEach((file, i) => {
                    console.log(`${i + 1}. ${file.company_name || file.company_id}`);
                    console.log(`   年度: ${file.fiscal_year}`);
                    console.log(`   タイプ: ${file.file_type}`);
                });

                // 最初のファイルをダウンロード
                const firstFile = data.data[0];
                console.log('\n📥 ファイルダウンロードテスト');
                console.log('対象:', firstFile.storage_path);

                const downloadResponse = await fetch(`${GATEWAY_URL}/download?path=${encodeURIComponent(firstFile.storage_path)}`, {
                    method: 'GET',
                    headers: {
                        'x-api-key': API_KEY
                    }
                });

                if (downloadResponse.status === 200) {
                    const content = await downloadResponse.text();
                    console.log('✅ ダウンロード成功');
                    console.log('サイズ:', content.length, 'バイト');
                    console.log('最初の200文字:');
                    console.log(content.substring(0, 200) + '...');
                } else {
                    const error = await downloadResponse.json();
                    console.log('❌ ダウンロード失敗:', error.error);
                }
            }
        } else {
            console.log('❌ エラー:', data.error);
        }
    } catch (error) {
        console.error('💥 エラー:', error.message);
    }

    console.log('\n' + '-'.repeat(60) + '\n');

    // 3. 無効なAPIキーでテスト
    console.log('🚫 無効なAPIキーでテスト');
    try {
        const response = await fetch(GATEWAY_URL, {
            method: 'GET',
            headers: {
                'x-api-key': 'invalid_key_12345'
            }
        });

        const data = await response.json();
        console.log('ステータス:', response.status);

        if (response.status === 401) {
            console.log('✅ 正しく拒否されました:', data.error);
        } else {
            console.log('❌ 予期しない応答');
        }
    } catch (error) {
        console.error('💥 エラー:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 このAPIゲートウェイはカスタムAPIキーのみで動作します');
    console.log('   anon keyは不要です');
}

// 実行
testAPIGateway().then(() => {
    console.log('\n✨ テスト完了');
    process.exit(0);
}).catch(err => {
    console.error('❌ テスト失敗:', err);
    process.exit(1);
});