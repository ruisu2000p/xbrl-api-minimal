-- ============================================================
-- api_keysテーブルの完全な構造を作成
-- 不足しているカラムをすべて追加
-- ============================================================

-- 1. 現在のapi_keysテーブル構造を確認
-- ============================================================
SELECT '========== 現在のapi_keys構造 ==========' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 2. 不足しているカラムを追加
-- ============================================================
DO $$
BEGIN
    -- nameカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'name') THEN
        ALTER TABLE api_keys ADD COLUMN name TEXT DEFAULT 'Default API Key';
        RAISE NOTICE 'Added column: name';
    END IF;

    -- created_atカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'created_at') THEN
        ALTER TABLE api_keys ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added column: created_at';
    END IF;

    -- updated_atカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'updated_at') THEN
        ALTER TABLE api_keys ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added column: updated_at';
    END IF;

    -- last_used_atカラム（エラーの原因）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'last_used_at') THEN
        ALTER TABLE api_keys ADD COLUMN last_used_at TIMESTAMPTZ;
        RAISE NOTICE 'Added column: last_used_at';
    END IF;

    -- expires_atカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'expires_at') THEN
        ALTER TABLE api_keys ADD COLUMN expires_at TIMESTAMPTZ;
        RAISE NOTICE 'Added column: expires_at';
    END IF;

    -- rate_limit_per_minuteカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_minute') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_minute INTEGER DEFAULT 60;
        RAISE NOTICE 'Added column: rate_limit_per_minute';
    END IF;

    -- rate_limit_per_hourカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_hour') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_hour INTEGER DEFAULT 1000;
        RAISE NOTICE 'Added column: rate_limit_per_hour';
    END IF;

    -- rate_limit_per_dayカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_day') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_day INTEGER DEFAULT 10000;
        RAISE NOTICE 'Added column: rate_limit_per_day';
    END IF;

    -- permissionsカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'permissions') THEN
        ALTER TABLE api_keys ADD COLUMN permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb;
        RAISE NOTICE 'Added column: permissions';
    END IF;

    -- key_suffixカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'key_suffix') THEN
        ALTER TABLE api_keys ADD COLUMN key_suffix TEXT;
        RAISE NOTICE 'Added column: key_suffix';
    END IF;

    -- statusカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'status') THEN
        ALTER TABLE api_keys ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE 'Added column: status';
    END IF;

    -- environmentカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'environment') THEN
        ALTER TABLE api_keys ADD COLUMN environment TEXT DEFAULT 'production';
        RAISE NOTICE 'Added column: environment';
    END IF;

    -- metadataカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'metadata') THEN
        ALTER TABLE api_keys ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Added column: metadata';
    END IF;

    -- tierカラム
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'tier') THEN
        ALTER TABLE api_keys ADD COLUMN tier TEXT DEFAULT 'free';
        RAISE NOTICE 'Added column: tier';
    END IF;

    -- daily_quotaカラム（互換性のため）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'daily_quota') THEN
        ALTER TABLE api_keys ADD COLUMN daily_quota INTEGER DEFAULT 100;
        RAISE NOTICE 'Added column: daily_quota';
    END IF;

    -- planカラム（互換性のため）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'plan') THEN
        ALTER TABLE api_keys ADD COLUMN plan TEXT DEFAULT 'free';
        RAISE NOTICE 'Added column: plan';
    END IF;
END $$;

-- 3. インデックスの作成（存在しない場合のみ）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

-- 4. 修正後の構造確認
-- ============================================================
SELECT '========== 修正後のapi_keys構造 ==========' as section;

SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL可' ELSE 'NOT NULL' END as nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 5. シンプルなAPIキー生成関数（エラーを避けるため簡略化）
-- ============================================================
CREATE OR REPLACE FUNCTION generate_simple_api_key(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_api_key TEXT;
    v_key_prefix TEXT;
    v_key_hash TEXT;
BEGIN
    -- APIキーを生成
    v_api_key := 'xbrl_live_' || substr(md5(random()::text || clock_timestamp()::text), 1, 32);
    v_key_prefix := substring(v_api_key, 1, 16);
    v_key_hash := encode(sha256(v_api_key::bytea), 'base64');
    
    -- 最小限の情報でINSERT（存在するカラムのみ）
    INSERT INTO api_keys (
        user_id,
        key_prefix,
        key_hash,
        is_active
    ) 
    SELECT 
        p_user_id,
        v_key_prefix,
        v_key_hash,
        true
    WHERE NOT EXISTS (
        SELECT 1 FROM api_keys 
        WHERE user_id = p_user_id 
        AND key_prefix = v_key_prefix
    );
    
    -- 追加のカラムを更新（存在する場合のみ）
    UPDATE api_keys
    SET 
        name = COALESCE(name, 'Default API Key'),
        created_at = COALESCE(created_at, NOW()),
        updated_at = NOW(),
        expires_at = COALESCE(expires_at, NOW() + INTERVAL '1 year'),
        rate_limit_per_minute = COALESCE(rate_limit_per_minute, 60),
        rate_limit_per_hour = COALESCE(rate_limit_per_hour, 1000),
        rate_limit_per_day = COALESCE(rate_limit_per_day, 10000)
    WHERE user_id = p_user_id AND key_prefix = v_key_prefix;
    
    RETURN v_api_key;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error generating API key: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. APIキーがないユーザーに生成
-- ============================================================
DO $$
DECLARE
    v_user RECORD;
    v_api_key TEXT;
    v_count INTEGER := 0;
BEGIN
    FOR v_user IN 
        SELECT u.id, u.email
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM api_keys k 
            WHERE k.user_id = u.id 
            AND k.is_active = true
        )
        LIMIT 20  -- 最初は20件でテスト
    LOOP
        v_api_key := generate_simple_api_key(v_user.id);
        IF v_api_key IS NOT NULL THEN
            v_count := v_count + 1;
            RAISE NOTICE 'Generated API key for user: %', v_user.email;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Total API keys generated: %', v_count;
END $$;

-- 7. 統計情報
-- ============================================================
SELECT '========== APIキー統計 ==========' as section;

WITH stats AS (
    SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT k.user_id) as users_with_keys,
        COUNT(k.id) as total_keys,
        COUNT(CASE WHEN k.is_active THEN 1 END) as active_keys
    FROM auth.users u
    LEFT JOIN api_keys k ON u.id = k.user_id
)
SELECT 
    total_users,
    users_with_keys,
    total_users - users_with_keys as users_without_keys,
    total_keys,
    active_keys
FROM stats;

-- 8. 最近のAPIキー
-- ============================================================
SELECT '========== 最近作成されたAPIキー（最新10件） ==========' as section;

SELECT 
    k.key_prefix || '...' as key_display,
    u.email,
    k.is_active,
    COALESCE(k.created_at, NOW()) as created_at,
    COALESCE(k.rate_limit_per_day, 10000) as daily_limit
FROM api_keys k
JOIN auth.users u ON k.user_id = u.id
ORDER BY COALESCE(k.created_at, NOW()) DESC
LIMIT 10;

-- 9. 完了メッセージ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ api_keysテーブルの構造修正完了';
    RAISE NOTICE '';
    RAISE NOTICE '【追加されたカラム】';
    RAISE NOTICE '- last_used_at（エラーの原因）';
    RAISE NOTICE '- expires_at';
    RAISE NOTICE '- created_at / updated_at';
    RAISE NOTICE '- rate_limit_per_minute/hour/day';
    RAISE NOTICE '- その他の必要カラム';
    RAISE NOTICE '';
    RAISE NOTICE '【次のステップ】';
    RAISE NOTICE '1. このSQLを実行してカラムを追加';
    RAISE NOTICE '2. fix-user-data-and-apikeys.sqlを再実行';
    RAISE NOTICE '============================================================';
END $$;