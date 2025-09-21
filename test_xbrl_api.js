// XBRL API接続テストスクリプト (Node.js)

const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const XBRL_API_KEY = 'xbrl_daf109b0ffaaee869ff05887ccbd13bdd77490da0b42d635';

async function testConnection() {
    console.log('=== XBRL API接続テスト ===\n');

    const headers = {
        'apikey': XBRL_API_KEY,
        'Authorization': `Bearer ${XBRL_API_KEY}`,
        'Content-Type': 'application/json'
    };

    // 1. 基本接続テスト
    console.log('[1] Companiesテーブル接続テスト...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=company_id,company_name&limit=1`, {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✓ 接続成功！');
            console.log('取得データ:', JSON.stringify(data, null, 2));
        } else {
            console.log(`✗ 接続失敗: ${response.status} ${response.statusText}`);
            const error = await response.text();
            console.log('エラー詳細:', error);
        }
    } catch (error) {
        console.log('✗ 接続エラー:', error.message);
    }

    // 2. APIキー検証テスト
    console.log('\n[2] APIキー検証テスト...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_api_key_hash`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ api_key_input: XBRL_API_KEY })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✓ APIキー検証成功！');
            console.log('レスポンス:', JSON.stringify(data, null, 2));
        } else {
            console.log(`✗ APIキー検証失敗: ${response.status}`);
            const error = await response.text();
            console.log('エラー詳細:', error);
        }
    } catch (error) {
        console.log('✗ 検証エラー:', error.message);
    }

    // 3. メタデータテーブルテスト
    console.log('\n[3] メタデータアクセステスト...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/markdown_files_metadata?select=company_name,fiscal_year&limit=1`, {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✓ メタデータアクセス成功！');
            console.log('取得データ:', JSON.stringify(data, null, 2));
        } else {
            console.log(`✗ メタデータアクセス失敗: ${response.status}`);
            const error = await response.text();
            console.log('エラー詳細:', error);
        }
    } catch (error) {
        console.log('✗ アクセスエラー:', error.message);
    }

    console.log('\n=== テスト完了 ===');
}

// 実行
testConnection().catch(console.error);