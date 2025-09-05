-- ============================================================
-- api_keysテーブルのカラム確認と修正
-- ============================================================

-- 1. 現在のapi_keysテーブル構造を確認
-- ============================================================
SELECT '========== api_keysテーブルの構造 ==========' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 2. 最小限の必須カラムのみ確認
-- ============================================================
SELECT '========== 必須カラムの確認 ==========' as section;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('id', 'user_id', 'key_prefix', 'key_hash', 'is_active') 
        THEN '✅ 必須' 
        ELSE '📝 オプション' 
    END as requirement_status
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
    AND column_name IN ('id', 'user_id', 'key_prefix', 'key_hash', 'is_active', 
                        'created_by', 'key_suffix', 'name', 'status', 'environment',
                        'tier', 'created_at', 'expires_at')
ORDER BY 
    CASE column_name
        WHEN 'id' THEN 1
        WHEN 'user_id' THEN 2
        WHEN 'key_prefix' THEN 3
        WHEN 'key_hash' THEN 4
        WHEN 'is_active' THEN 5
        ELSE 6
    END;

-- 3. テストINSERT（最小限のカラムのみ）
-- ============================================================
SELECT '========== テストINSERT実行 ==========' as section;

-- テスト用のユーザーIDを取得
DO $$
DECLARE
    v_test_user_id UUID;
    v_test_key_prefix TEXT := 'xbrl_test_' || substr(md5(random()::text), 1, 6);
    v_test_key_hash TEXT := encode(sha256(('test_key_' || random())::bytea), 'base64');
BEGIN
    -- 最初のユーザーIDを取得
    SELECT id INTO v_test_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
        -- 最小限のカラムでINSERTを試みる
        BEGIN
            INSERT INTO api_keys (user_id, key_prefix, key_hash, is_active)
            VALUES (v_test_user_id, v_test_key_prefix, v_test_key_hash, false);
            
            RAISE NOTICE '✅ 最小限のカラムでのINSERT成功';
            
            -- テストレコードを削除
            DELETE FROM api_keys 
            WHERE key_prefix = v_test_key_prefix;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ INSERT失敗: %', SQLERRM;
            RAISE NOTICE '必要なカラムが不足している可能性があります';
        END;
    ELSE
        RAISE NOTICE '⚠️ テスト用ユーザーが見つかりません';
    END IF;
END $$;

-- 4. 実際に使用可能なカラムのリスト
-- ============================================================
SELECT '========== 使用可能なカラム一覧 ==========' as section;

WITH column_info AS (
    SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default IS NOT NULL as has_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND table_name = 'api_keys'
)
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN is_nullable = 'YES' OR has_default THEN '✅ 使用可能（省略可）'
        WHEN column_name IN ('id', 'user_id', 'key_prefix', 'key_hash', 'is_active') THEN '⚠️ 必須'
        ELSE '❓ 確認必要'
    END as usability
FROM column_info
ORDER BY 
    CASE 
        WHEN column_name IN ('id', 'user_id', 'key_prefix', 'key_hash', 'is_active') THEN 0
        ELSE 1
    END,
    column_name;

-- 5. 推奨される修正
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📋 推奨される対応';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE '1. APIキー生成時は以下の最小限のカラムのみ使用:';
    RAISE NOTICE '   - user_id (必須)';
    RAISE NOTICE '   - key_prefix (必須)';
    RAISE NOTICE '   - key_hash (必須)';
    RAISE NOTICE '   - is_active (必須)';
    RAISE NOTICE '';
    RAISE NOTICE '2. オプショナルなカラムは別途UPDATE文で追加';
    RAISE NOTICE '';
    RAISE NOTICE '3. 存在しないカラムへの参照を避ける:';
    RAISE NOTICE '   - created_by';
    RAISE NOTICE '   - key_suffix（存在する場合のみ使用）';
    RAISE NOTICE '   - その他のメタデータカラム';
    RAISE NOTICE '============================================================';
END $$;