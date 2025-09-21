/**
 * JWT生成ヘルパー関数
 * APIキーからカスタムJWTを生成する
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

// JWT署名用のシークレット（Supabaseダッシュボードから取得）
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * APIキーからJWTを生成
 * @param {string} apiKey - xbrl_v1_で始まるAPIキー
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
async function generateJWTFromAPIKey(apiKey) {
    try {
        // APIキーの形式チェック
        if (!apiKey || !apiKey.startsWith('xbrl_v1_')) {
            return { success: false, error: '無効なAPIキー形式' };
        }

        // マスクキーを生成（検索用）
        const keyPart = apiKey.substring(8);
        const masked = `xbrl_v1_${keyPart.substring(0, 4)}****${keyPart.substring(keyPart.length - 4)}`;

        console.log('🔍 APIキー検証中...');
        console.log('マスクキー:', masked);

        // データベースからAPIキー情報を取得
        const { data: apiKeyData, error: fetchError } = await supabase
            .from('api_keys')
            .select('*')
            .eq('masked_key', masked)
            .eq('is_active', true)
            .single();

        if (fetchError || !apiKeyData) {
            console.error('❌ APIキーが見つかりません:', fetchError);
            return { success: false, error: 'APIキーが見つかりません' };
        }

        console.log('📊 APIキー情報:');
        console.log('- ID:', apiKeyData.id);
        console.log('- 名前:', apiKeyData.name);
        console.log('- ティア:', apiKeyData.tier);

        // bcryptでハッシュ検証
        const isValid = await bcrypt.compare(apiKey, apiKeyData.key_hash);
        if (!isValid) {
            console.error('❌ ハッシュ検証失敗');
            return { success: false, error: 'APIキーの検証に失敗しました' };
        }

        console.log('✅ ハッシュ検証成功');

        // 使用記録を更新
        await supabase
            .from('api_keys')
            .update({
                last_used_at: new Date().toISOString(),
                request_count: (apiKeyData.request_count || 0) + 1
            })
            .eq('id', apiKeyData.id);

        // ロールをティアに応じて決定
        const role = apiKeyData.tier === 'free' ? 'xbrl_free' :
                    apiKeyData.tier === 'basic' ? 'xbrl_basic' :
                    'xbrl_reader';

        console.log('🎫 JWT生成中...');
        console.log('- ロール:', role);

        // JWTペイロード
        const payload = {
            // 標準クレーム
            sub: apiKeyData.id,                           // Subject: APIキーID
            role: role,                                   // カスタムロール
            iss: 'xbrl-api-system',                      // Issuer
            aud: 'authenticated',                         // Audience
            exp: Math.floor(Date.now() / 1000) + 3600,   // 有効期限: 1時間
            iat: Math.floor(Date.now() / 1000),          // 発行時刻

            // カスタムクレーム
            api_key_id: apiKeyData.id,
            tier: apiKeyData.tier,
            permissions: apiKeyData.permissions || { read_markdown: true },
            name: apiKeyData.name
        };

        // JWT生成
        const token = jwt.sign(payload, JWT_SECRET, {
            algorithm: 'HS256'
        });

        console.log('✅ JWT生成成功');
        console.log('- トークン長:', token.length, '文字');
        console.log('- 有効期限:', new Date(payload.exp * 1000).toLocaleString('ja-JP'));

        return {
            success: true,
            token: token,
            payload: payload
        };

    } catch (error) {
        console.error('💥 エラー:', error);
        return { success: false, error: error.message };
    }
}

/**
 * JWTをデコードして内容を確認
 * @param {string} token - JWTトークン
 */
function decodeJWT(token) {
    try {
        const decoded = jwt.decode(token, { complete: true });
        console.log('\n📋 JWTデコード結果:');
        console.log('ヘッダー:', JSON.stringify(decoded.header, null, 2));
        console.log('ペイロード:', JSON.stringify(decoded.payload, null, 2));
        return decoded;
    } catch (error) {
        console.error('デコードエラー:', error);
        return null;
    }
}

/**
 * JWTを検証
 * @param {string} token - JWTトークン
 */
function verifyJWT(token) {
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        console.log('\n✅ JWT検証成功:');
        console.log(JSON.stringify(verified, null, 2));
        return verified;
    } catch (error) {
        console.error('❌ JWT検証失敗:', error.message);
        return null;
    }
}

// テスト実行
async function test() {
    console.log('🚀 JWT生成テスト開始\n');
    console.log('=' .repeat(60));

    // テスト用のAPIキー
    const testApiKeys = [
        'xbrl_v1_ead23e30246d88250fdf4423c1e1491d',
        'xbrl_v1_8b46fafbde00356ab72577e9eeba2709'
    ];

    for (const apiKey of testApiKeys) {
        console.log('\n🔐 テストAPIキー:', apiKey.substring(0, 30) + '...');
        console.log('-'.repeat(60));

        const result = await generateJWTFromAPIKey(apiKey);

        if (result.success) {
            console.log('\n📦 生成されたJWT:');
            console.log(result.token);

            // JWTをデコードして確認
            decodeJWT(result.token);

            // JWTを検証
            verifyJWT(result.token);
        } else {
            console.error('❌ JWT生成失敗:', result.error);
        }

        console.log('\n' + '='.repeat(60));
    }
}

// コマンドライン引数でAPIキーが指定された場合
if (process.argv[2]) {
    const apiKey = process.argv[2];
    generateJWTFromAPIKey(apiKey).then(result => {
        if (result.success) {
            console.log('\n🎉 JWT生成成功！');
            console.log('\n生成されたトークン:');
            console.log(result.token);
            console.log('\n使用方法:');
            console.log('curl -H "Authorization: Bearer ' + result.token + '" \\');
            console.log('  https://wpwqxhyiglbtlaimrjrx.supabase.co/rest/v1/markdown_files_metadata');
        } else {
            console.error('失敗:', result.error);
            process.exit(1);
        }
    });
} else {
    // テストモード
    test().then(() => {
        console.log('\n✨ テスト完了');
    }).catch(err => {
        console.error('テスト失敗:', err);
        process.exit(1);
    });
}

module.exports = {
    generateJWTFromAPIKey,
    decodeJWT,
    verifyJWT
};