-- ============================================================
-- 既存のテーブル構造確認SQL
-- Supabase SQL Editorで実行して現在の状態を確認
-- ============================================================

-- 1. 既存のテーブル一覧を確認
-- ============================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. api_keysテーブルの構造を確認
-- ============================================================
SELECT 
    '=== api_keys テーブルの構造 ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 3. api_usageテーブルの構造を確認
-- ============================================================
SELECT 
    '=== api_usage テーブルの構造 ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_usage'
ORDER BY ordinal_position;

-- 4. profilesテーブルの構造を確認
-- ============================================================
SELECT 
    '=== profiles テーブルの構造 ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. インデックス一覧を確認
-- ============================================================
SELECT 
    '=== インデックス一覧 ===' as info;

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('api_keys', 'api_usage', 'profiles')
ORDER BY tablename, indexname;

-- 6. 外部キー制約を確認
-- ============================================================
SELECT 
    '=== 外部キー制約 ===' as info;

SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('api_keys', 'api_usage', 'profiles');

-- 7. RLSポリシーを確認
-- ============================================================
SELECT 
    '=== RLSポリシー ===' as info;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('api_keys', 'api_usage', 'profiles');

-- 8. テーブルのレコード数を確認
-- ============================================================
SELECT 
    '=== レコード数 ===' as info;

SELECT 
    'api_keys' as table_name,
    COUNT(*) as record_count
FROM api_keys
UNION ALL
SELECT 
    'api_usage' as table_name,
    COUNT(*) as record_count
FROM api_usage
UNION ALL
SELECT 
    'profiles' as table_name,
    COUNT(*) as record_count
FROM profiles;

-- 9. 最近のapi_keysレコードのサンプル（個人情報を除く）
-- ============================================================
SELECT 
    '=== api_keys サンプル (最新5件) ===' as info;

SELECT 
    id,
    user_id,
    key_prefix,
    is_active,
    created_at,
    updated_at,
    last_used_at
FROM api_keys
ORDER BY created_at DESC NULLS LAST
LIMIT 5;

-- 10. 存在する関数の確認
-- ============================================================
SELECT 
    '=== 関数一覧 ===' as info;

SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'generate_api_key',
        'check_rate_limit',
        'increment_rate_limit',
        'handle_new_user',
        'update_updated_at',
        'cleanup_old_rate_limits',
        'archive_old_usage'
    );

-- 11. ビューの確認
-- ============================================================
SELECT 
    '=== ビュー一覧 ===' as info;

SELECT 
    table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 12. 診断結果サマリー
-- ============================================================
SELECT 
    '=== 診断結果サマリー ===' as info;

WITH table_info AS (
    SELECT 
        'api_keys' as tbl,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') as exists,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'api_keys') as col_count
    UNION ALL
    SELECT 
        'api_usage' as tbl,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage') as exists,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'api_usage') as col_count
    UNION ALL
    SELECT 
        'profiles' as tbl,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') as exists,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles') as col_count
)
SELECT 
    tbl as table_name,
    CASE WHEN exists THEN '✅ 存在' ELSE '❌ 存在しない' END as status,
    col_count as column_count,
    CASE 
        WHEN NOT exists THEN '要作成'
        WHEN tbl = 'api_keys' AND col_count < 10 THEN 'カラム追加必要'
        WHEN tbl = 'api_usage' AND col_count < 10 THEN 'カラム追加必要'
        WHEN tbl = 'profiles' AND col_count < 8 THEN 'カラム追加必要'
        ELSE '正常'
    END as action_needed
FROM table_info;