/**
 * XBRL API キー自動生成スクリプト
 *
 * このスクリプトは新規ユーザー用のAPIキーを自動生成します。
 * Service Role Keyが必要なため、サーバー側でのみ実行してください。
 */

const crypto = require('crypto');

/**
 * APIキーの自動生成
 * @param {string} tier - 'free', 'basic', 'pro'
 * @param {string} environment - 'development', 'production'
 * @returns {object} APIキー情報
 */
function generateApiKey(tier = 'free', environment = 'production') {
    // 1. ユニークなキーIDを生成
    const keyId = crypto.randomUUID();

    // 2. ランダムなシークレットを生成（32バイト）
    const secret = crypto.randomBytes(32).toString('base64url');

    // 3. APIキーの形式を作成
    const version = 'v1';
    const prefix = `xbrl_${environment === 'production' ? 'live' : 'test'}_${version}_${keyId}`;
    const apiKey = `${prefix}_${secret}`;

    // 4. ハッシュ化（データベース保存用）
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // 5. マスク表示用（最初と最後の文字のみ表示）
    const maskedKey = `${prefix.substring(0, 15)}${'*'.repeat(20)}${secret.substring(secret.length - 4)}`;

    // 6. メタデータ
    const metadata = {
        id: crypto.randomUUID(),
        key_hash: hash,
        key_prefix: prefix,
        key_suffix: secret.substring(secret.length - 4),
        masked_key: maskedKey,
        tier: tier,
        environment: environment,
        created_at: new Date().toISOString(),
        expires_at: tier === 'pro' ?
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : // 1年
            null, // 無期限
        rate_limit_per_minute: tier === 'pro' ? 100 : tier === 'basic' ? 60 : 30,
        rate_limit_per_hour: tier === 'pro' ? 5000 : tier === 'basic' ? 2000 : 500,
        rate_limit_per_day: tier === 'pro' ? 50000 : tier === 'basic' ? 10000 : 1000,
        is_active: true,
        permissions: {
            read_data: true,
            write_data: tier !== 'free',
            delete_data: tier === 'pro',
            access_years: tier === 'free' ? ['FY2025'] : 'all'
        }
    };

    return {
        apiKey: apiKey,        // ユーザーに渡す実際のキー
        metadata: metadata     // データベースに保存するメタデータ
    };
}

/**
 * Supabaseにキーを登録
 */
async function registerApiKey(metadata) {
    // ここではSQL文を生成（実際の実行はSupabase側で）
    const sql = `
        INSERT INTO api_keys (
            id, key_hash, key_prefix, key_suffix, masked_key,
            name, tier, environment, created_at, expires_at,
            rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day,
            is_active, permissions, metadata, updated_at
        ) VALUES (
            '${metadata.id}',
            '${metadata.key_hash}',
            '${metadata.key_prefix}',
            '${metadata.key_suffix}',
            '${metadata.masked_key}',
            'Auto-Generated Key ${new Date().toLocaleDateString()}',
            '${metadata.tier}',
            '${metadata.environment}',
            '${metadata.created_at}',
            ${metadata.expires_at ? `'${metadata.expires_at}'` : 'NULL'},
            ${metadata.rate_limit_per_minute},
            ${metadata.rate_limit_per_hour},
            ${metadata.rate_limit_per_day},
            ${metadata.is_active},
            '${JSON.stringify(metadata.permissions)}'::jsonb,
            '${JSON.stringify({generated_by: 'automatic', version: '1.0'})}'::jsonb,
            NOW()
        );
    `;

    return sql;
}

/**
 * メイン実行
 */
async function main() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   XBRL API キー自動生成システム        ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // コマンドライン引数からティアを取得
    const args = process.argv.slice(2);
    const tier = args[0] || 'free';
    const environment = args[1] || 'production';

    console.log(`設定: ティア=${tier}, 環境=${environment}`);
    console.log('');

    // APIキーを生成
    const { apiKey, metadata } = generateApiKey(tier, environment);

    console.log('【生成されたAPIキー】');
    console.log('━'.repeat(50));
    console.log(`実際のキー: ${apiKey}`);
    console.log(`マスク表示: ${metadata.masked_key}`);
    console.log('');

    console.log('【メタデータ】');
    console.log('━'.repeat(50));
    console.log(`ID: ${metadata.id}`);
    console.log(`ティア: ${metadata.tier}`);
    console.log(`環境: ${metadata.environment}`);
    console.log(`レート制限: ${metadata.rate_limit_per_minute}/分, ${metadata.rate_limit_per_hour}/時, ${metadata.rate_limit_per_day}/日`);
    console.log(`有効期限: ${metadata.expires_at || '無期限'}`);
    console.log('');

    // SQL生成
    const sql = await registerApiKey(metadata);

    console.log('【データベース登録用SQL】');
    console.log('━'.repeat(50));
    console.log('以下のSQLをSupabase SQL Editorで実行してください:');
    console.log('');
    console.log(sql);
    console.log('');

    // 設定ファイル用の出力
    console.log('【.env.local 設定】');
    console.log('━'.repeat(50));
    console.log(`XBRL_API_KEY=${apiKey}`);
    console.log('');

    console.log('【MCP設定 (claude_desktop_config.json)】');
    console.log('━'.repeat(50));
    const mcpConfig = {
        "mcpServers": {
            "xbrl-financial": {
                "command": "npx",
                "args": ["shared-supabase-mcp-minimal"],
                "env": {
                    "XBRL_API_KEY": apiKey,
                    "XBRL_API_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/gateway-simple"
                }
            }
        }
    };
    console.log(JSON.stringify(mcpConfig, null, 2));
    console.log('');

    console.log('✅ APIキーの生成が完了しました');
    console.log('');
    console.log('【重要】');
    console.log('1. 生成されたAPIキーは安全に保管してください');
    console.log('2. キーは一度しか表示されません');
    console.log('3. 紛失した場合は新しいキーを生成してください');
    console.log('');

    // ファイルに保存（オプション）
    if (args[2] === '--save') {
        const fs = require('fs');
        const filename = `api-key-${metadata.tier}-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify({
            apiKey: apiKey,
            metadata: metadata,
            sql: sql
        }, null, 2));
        console.log(`📁 キー情報を ${filename} に保存しました`);
    }
}

// 実行
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { generateApiKey, registerApiKey };

/**
 * 使用方法:
 *
 * 1. 基本（freeティア）:
 *    node generate-api-key-automatic.js
 *
 * 2. Basicティア:
 *    node generate-api-key-automatic.js basic
 *
 * 3. Proティア（本番環境）:
 *    node generate-api-key-automatic.js pro production
 *
 * 4. 開発環境用:
 *    node generate-api-key-automatic.js basic development
 *
 * 5. ファイル保存付き:
 *    node generate-api-key-automatic.js pro production --save
 */