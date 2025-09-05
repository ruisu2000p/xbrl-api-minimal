-- ============================================================
-- 既存のテーブル構造確認SQL（安全版）
-- 存在しないカラムを参照しないよう動的にチェック
-- ============================================================

-- 1. 既存のテーブル一覧を確認
-- ============================================================
SELECT 
    '========== テーブル一覧 ==========' as section;

SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('api_keys', 'api_usage', 'profiles', 'subscription_plans', 'rate_limit_counters')
ORDER BY table_name;

-- 2. api_keysテーブルの構造を確認
-- ============================================================
SELECT 
    '========== api_keys テーブル構造 ==========' as section;

SELECT 
    ordinal_position as "#",
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL可' ELSE 'NOT NULL' END as nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 3. api_usageテーブルの構造を確認
-- ============================================================
SELECT 
    '========== api_usage テーブル構造 ==========' as section;

SELECT 
    ordinal_position as "#",
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL可' ELSE 'NOT NULL' END as nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_usage'
ORDER BY ordinal_position;

-- 4. profilesテーブルの構造を確認
-- ============================================================
SELECT 
    '========== profiles テーブル構造 ==========' as section;

SELECT 
    ordinal_position as "#",
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL可' ELSE 'NOT NULL' END as nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. 必要なカラムの存在チェック
-- ============================================================
SELECT 
    '========== 必要カラムの存在チェック ==========' as section;

WITH required_columns AS (
    -- api_keysの必要カラム
    SELECT 'api_keys' as table_name, 'id' as column_name, 'UUID' as expected_type
    UNION ALL SELECT 'api_keys', 'user_id', 'UUID'
    UNION ALL SELECT 'api_keys', 'key_prefix', 'TEXT'
    UNION ALL SELECT 'api_keys', 'key_hash', 'TEXT'
    UNION ALL SELECT 'api_keys', 'is_active', 'BOOLEAN'
    UNION ALL SELECT 'api_keys', 'created_at', 'TIMESTAMPTZ'
    UNION ALL SELECT 'api_keys', 'updated_at', 'TIMESTAMPTZ'
    UNION ALL SELECT 'api_keys', 'name', 'TEXT'
    UNION ALL SELECT 'api_keys', 'last_used_at', 'TIMESTAMPTZ'
    UNION ALL SELECT 'api_keys', 'expires_at', 'TIMESTAMPTZ'
    UNION ALL SELECT 'api_keys', 'rate_limit_per_minute', 'INTEGER'
    UNION ALL SELECT 'api_keys', 'rate_limit_per_hour', 'INTEGER'
    UNION ALL SELECT 'api_keys', 'rate_limit_per_day', 'INTEGER'
    
    -- api_usageの必要カラム
    UNION ALL SELECT 'api_usage', 'id', 'UUID'
    UNION ALL SELECT 'api_usage', 'api_key_id', 'UUID'
    UNION ALL SELECT 'api_usage', 'user_id', 'UUID'
    UNION ALL SELECT 'api_usage', 'endpoint', 'TEXT'
    UNION ALL SELECT 'api_usage', 'method', 'TEXT'
    UNION ALL SELECT 'api_usage', 'status_code', 'INTEGER'
    UNION ALL SELECT 'api_usage', 'created_at', 'TIMESTAMPTZ'
    UNION ALL SELECT 'api_usage', 'response_time_ms', 'INTEGER'
    
    -- profilesの必要カラム
    UNION ALL SELECT 'profiles', 'id', 'UUID'
    UNION ALL SELECT 'profiles', 'email', 'TEXT'
    UNION ALL SELECT 'profiles', 'full_name', 'TEXT'
    UNION ALL SELECT 'profiles', 'plan', 'TEXT'
    UNION ALL SELECT 'profiles', 'created_at', 'TIMESTAMPTZ'
    UNION ALL SELECT 'profiles', 'updated_at', 'TIMESTAMPTZ'
),
existing_columns AS (
    SELECT 
        table_name,
        column_name,
        UPPER(data_type) as data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name IN ('api_keys', 'api_usage', 'profiles')
)
SELECT 
    r.table_name,
    r.column_name,
    r.expected_type,
    CASE 
        WHEN e.column_name IS NOT NULL THEN '✅ 存在'
        ELSE '❌ 不足'
    END as status,
    e.data_type as actual_type
FROM required_columns r
LEFT JOIN existing_columns e 
    ON r.table_name = e.table_name 
    AND r.column_name = e.column_name
ORDER BY 
    r.table_name,
    CASE WHEN e.column_name IS NULL THEN 0 ELSE 1 END,
    r.column_name;

-- 6. インデックスの存在チェック
-- ============================================================
SELECT 
    '========== インデックス ==========' as section;

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('api_keys', 'api_usage', 'profiles')
ORDER BY tablename, indexname;

-- 7. テーブルのレコード数（テーブルが存在する場合のみ）
-- ============================================================
SELECT 
    '========== レコード数 ==========' as section;

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- api_keysのレコード数
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        SELECT COUNT(*) INTO v_count FROM api_keys;
        RAISE NOTICE 'api_keys: % records', v_count;
    ELSE
        RAISE NOTICE 'api_keys: テーブルが存在しません';
    END IF;
    
    -- api_usageのレコード数
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage') THEN
        SELECT COUNT(*) INTO v_count FROM api_usage;
        RAISE NOTICE 'api_usage: % records', v_count;
    ELSE
        RAISE NOTICE 'api_usage: テーブルが存在しません';
    END IF;
    
    -- profilesのレコード数
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        SELECT COUNT(*) INTO v_count FROM profiles;
        RAISE NOTICE 'profiles: % records', v_count;
    ELSE
        RAISE NOTICE 'profiles: テーブルが存在しません';
    END IF;
END $$;

-- 8. 診断結果サマリー
-- ============================================================
SELECT 
    '========== 診断結果サマリー ==========' as section;

WITH table_summary AS (
    SELECT 
        t.table_name,
        COUNT(c.column_name) as column_count,
        STRING_AGG(c.column_name, ', ' ORDER BY c.ordinal_position) as columns
    FROM (
        SELECT 'api_keys' as table_name
        UNION ALL SELECT 'api_usage'
        UNION ALL SELECT 'profiles'
    ) t
    LEFT JOIN information_schema.columns c
        ON c.table_schema = 'public' 
        AND c.table_name = t.table_name
    GROUP BY t.table_name
)
SELECT 
    table_name,
    CASE 
        WHEN column_count = 0 THEN '❌ テーブル不在'
        WHEN table_name = 'api_keys' AND column_count < 8 THEN '⚠️ カラム不足'
        WHEN table_name = 'api_usage' AND column_count < 6 THEN '⚠️ カラム不足'
        WHEN table_name = 'profiles' AND column_count < 5 THEN '⚠️ カラム不足'
        ELSE '✅ OK'
    END as status,
    column_count,
    CASE 
        WHEN column_count = 0 THEN 'テーブル作成が必要'
        WHEN table_name = 'api_keys' AND column_count < 8 THEN 'カラム追加が必要'
        WHEN table_name = 'api_usage' AND column_count < 6 THEN 'カラム追加が必要'
        WHEN table_name = 'profiles' AND column_count < 5 THEN 'カラム追加が必要'
        ELSE '正常'
    END as action,
    columns
FROM table_summary
ORDER BY table_name;

-- 9. 推奨される次のステップ
-- ============================================================
SELECT 
    '========== 推奨アクション ==========' as section;

WITH missing_tables AS (
    SELECT 'api_keys' as table_name
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys')
    UNION ALL
    SELECT 'api_usage'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage')
    UNION ALL
    SELECT 'profiles'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 
            '1. user-api-management-safe.sql を実行してテーブルを作成'
        ELSE 
            '1. user-api-management-minimal.sql を実行してカラムを追加'
    END as recommended_action
FROM missing_tables;

-- 10. 既存データのサンプル（安全に取得）
-- ============================================================
SELECT 
    '========== api_keys サンプル（存在する場合） ==========' as section;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        -- カラムの存在を動的にチェックして安全にSELECT
        EXECUTE '
        SELECT 
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''api_keys'' AND column_name = ''id'') 
                THEN id::text ELSE ''N/A'' END as id,
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''api_keys'' AND column_name = ''key_prefix'') 
                THEN key_prefix ELSE ''N/A'' END as key_prefix,
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''api_keys'' AND column_name = ''is_active'') 
                THEN is_active::text ELSE ''N/A'' END as is_active
        FROM api_keys
        LIMIT 3';
    ELSE
        RAISE NOTICE 'api_keys テーブルが存在しません';
    END IF;
END $$;