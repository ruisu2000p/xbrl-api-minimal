const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Supabase設定
const SUPABASE_URL = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

// 登録するAPIキー
const API_KEYS = [
    'xbrl_v1_8b46fafbde00356ab72577e9eeba2709',
    'xbrl_v1_ead23e30246d88250fdf4423c1e1491d'
];

async function registerApiKeys() {
    console.log('🔐 APIキーをbcryptで登録中...\n');

    // Service roleで初期化
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    for (const apiKey of API_KEYS) {
        try {
            // bcryptでハッシュ化（フロントエンドと同じsalt rounds: 6）
            const salt = await bcrypt.genSalt(6);
            const keyHash = await bcrypt.hash(apiKey, salt);

            // キーのプレフィックスとサフィックスを抽出
            const keyPrefix = apiKey.substring(0, 12);
            const keySuffix = apiKey.substring(apiKey.length - 4);
            const maskedKey = `${keyPrefix}****${keySuffix}`;

            // 公開IDを生成
            const publicId = crypto.randomUUID();

            const { data, error } = await supabase
                .from('api_keys')
                .upsert({
                    key_hash: keyHash,
                    name: apiKey === API_KEYS[0] ? 'MCP API Key' : 'Custom API Key',
                    tier: 'pro',
                    is_active: true,
                    status: 'active',
                    environment: 'production',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    key_prefix: keyPrefix,
                    key_suffix: keySuffix,
                    masked_key: maskedKey,
                    public_id: publicId,
                    version: 1,
                    rate_limit_per_minute: 100,
                    rate_limit_per_hour: 2000,
                    rate_limit_per_day: 50000,
                    total_requests: 0,
                    successful_requests: 0,
                    failed_requests: 0,
                    permissions: {
                        scopes: ['read:markdown', 'read:companies', 'read:documents'],
                        endpoints: ['*'],
                        rate_limit: 1000
                    },
                    metadata: {}
                }, {
                    onConflict: 'masked_key',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error(`❌ エラー (${apiKey.substring(0, 20)}...):`, error.message);
            } else {
                console.log(`✅ 登録成功: ${maskedKey}`);
                console.log(`   - 名前: ${data[0].name}`);
                console.log(`   - ティア: ${data[0].tier}`);
                console.log(`   - ハッシュ: ${keyHash.substring(0, 30)}...`);
                console.log(`   - 公開ID: ${publicId}\n`);
            }
        } catch (err) {
            console.error(`💥 予期しないエラー:`, err);
        }
    }
}

// パッケージチェック
try {
    require.resolve('bcryptjs');
    registerApiKeys().then(() => {
        console.log('✨ 完了');
        process.exit(0);
    });
} catch(e) {
    console.log('📦 bcryptjsをインストールしています...');
    require('child_process').execSync('npm install bcryptjs', {stdio: 'inherit'});
    console.log('✅ インストール完了\n');
    registerApiKeys().then(() => {
        console.log('✨ 完了');
        process.exit(0);
    });
}