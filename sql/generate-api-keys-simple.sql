-- ============================================================
-- シンプルなAPIキー生成SQL
-- 確実にAPIキーを生成するための最小限の実装
-- ============================================================

-- 1. 現在の状況確認
-- ============================================================
SELECT '========== 現在の状況 ==========' as section;

-- ユーザー数とAPIキー数
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM api_keys) as total_api_keys,
    (SELECT COUNT(*) FROM api_keys WHERE is_active = true) as active_api_keys;

-- 最初の5ユーザーの状況
SELECT 
    u.id,
    u.email,
    u.created_at,
    (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id) as api_key_count
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 5;

-- 2. 最もシンプルなAPIキー生成（1ユーザーずつ）
-- ============================================================
DO $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_api_key TEXT;
    v_key_prefix TEXT;
    v_key_hash TEXT;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    -- 最新のユーザーから順に処理
    FOR v_user_id, v_user_email IN 
        SELECT id, email 
        FROM auth.users 
        ORDER BY created_at DESC 
        LIMIT 10  -- まず10人だけテスト
    LOOP
        BEGIN
            -- シンプルなキー生成
            v_api_key := 'xbrl_live_' || substr(md5(v_user_id::text || now()::text), 1, 32);
            v_key_prefix := substr(v_api_key, 1, 16);
            v_key_hash := encode(sha256(v_api_key::bytea), 'hex');
            
            -- 既存のキーを確認
            IF NOT EXISTS (
                SELECT 1 FROM api_keys 
                WHERE user_id = v_user_id 
                AND is_active = true
            ) THEN
                -- INSERT（最小限のカラムのみ）
                INSERT INTO api_keys (
                    user_id,
                    key_prefix,
                    key_hash,
                    is_active
                ) VALUES (
                    v_user_id,
                    v_key_prefix,
                    v_key_hash,
                    true
                );
                
                v_success_count := v_success_count + 1;
                RAISE NOTICE 'APIキー生成成功: % (user: %)', v_key_prefix || '...', v_user_email;
            ELSE
                RAISE NOTICE 'APIキー既存: user %', v_user_email;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE NOTICE 'エラー (user %): %', v_user_email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========== 結果 ==========';
    RAISE NOTICE '成功: % 件', v_success_count;
    RAISE NOTICE 'エラー: % 件', v_error_count;
END $$;

-- 3. 生成されたAPIキーの確認
-- ============================================================
SELECT '========== 生成されたAPIキー ==========' as section;

SELECT 
    k.user_id,
    u.email,
    k.key_prefix || '...' as api_key_display,
    k.is_active,
    k.id as key_id
FROM api_keys k
JOIN auth.users u ON k.user_id = u.id
ORDER BY k.id DESC
LIMIT 10;

-- 4. すべてのユーザーにAPIキーを生成（必要な場合のみ実行）
-- ============================================================
-- 注意：このブロックは手動でコメントを外して実行してください
/*
DO $$
DECLARE
    v_user RECORD;
    v_api_key TEXT;
    v_key_prefix TEXT;
    v_key_hash TEXT;
    v_count INTEGER := 0;
BEGIN
    FOR v_user IN 
        SELECT id, email 
        FROM auth.users 
        WHERE NOT EXISTS (
            SELECT 1 FROM api_keys 
            WHERE user_id = auth.users.id 
            AND is_active = true
        )
    LOOP
        v_api_key := 'xbrl_live_' || substr(md5(v_user.id::text || now()::text || random()::text), 1, 32);
        v_key_prefix := substr(v_api_key, 1, 16);
        v_key_hash := encode(sha256(v_api_key::bytea), 'hex');
        
        INSERT INTO api_keys (user_id, key_prefix, key_hash, is_active)
        VALUES (v_user.id, v_key_prefix, v_key_hash, true)
        ON CONFLICT DO NOTHING;
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Generated % API keys', v_count;
END $$;
*/

-- 5. デモユーザーとAPIキーの作成
-- ============================================================
DO $$
DECLARE
    v_demo_user_id UUID;
    v_api_key TEXT;
    v_key_prefix TEXT;
    v_key_hash TEXT;
BEGIN
    -- demo@example.comユーザーを探す
    SELECT id INTO v_demo_user_id 
    FROM auth.users 
    WHERE email = 'demo@example.com';
    
    IF v_demo_user_id IS NOT NULL THEN
        -- APIキーを生成
        v_api_key := 'xbrl_live_demo_' || substr(md5('demo_key_' || now()::text), 1, 28);
        v_key_prefix := substr(v_api_key, 1, 16);
        v_key_hash := encode(sha256(v_api_key::bytea), 'hex');
        
        -- 既存のデモキーを無効化
        UPDATE api_keys 
        SET is_active = false 
        WHERE user_id = v_demo_user_id;
        
        -- 新しいキーを作成
        INSERT INTO api_keys (user_id, key_prefix, key_hash, is_active)
        VALUES (v_demo_user_id, v_key_prefix, v_key_hash, true);
        
        -- オプションのカラムを更新（存在する場合）
        UPDATE api_keys
        SET 
            name = 'Demo API Key',
            created_at = NOW(),
            expires_at = NOW() + INTERVAL '1 year',
            rate_limit_per_day = 10000
        WHERE user_id = v_demo_user_id AND key_prefix = v_key_prefix;
        
        RAISE NOTICE '';
        RAISE NOTICE '========== デモユーザー情報 ==========';
        RAISE NOTICE 'Email: demo@example.com';
        RAISE NOTICE 'APIキー: %', v_api_key;
        RAISE NOTICE '※このAPIキーは一度だけ表示されます';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '========== デモユーザー作成手順 ==========';
        RAISE NOTICE '1. Supabase Dashboard > Authentication > Users';
        RAISE NOTICE '2. Add user → Create new user';
        RAISE NOTICE '3. Email: demo@example.com';
        RAISE NOTICE '4. Password: Demo1234!';
        RAISE NOTICE '5. Auto Confirm User: チェック';
        RAISE NOTICE '6. このSQLを再実行';
        RAISE NOTICE '';
    END IF;
END $$;

-- 6. 最終確認
-- ============================================================
SELECT '========== 最終統計 ==========' as section;

SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Users with API Keys',
    COUNT(DISTINCT user_id)
FROM api_keys
WHERE is_active = true
UNION ALL
SELECT 
    'Active API Keys',
    COUNT(*)
FROM api_keys
WHERE is_active = true
UNION ALL
SELECT 
    'Users without API Keys',
    COUNT(*)
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM api_keys k 
    WHERE k.user_id = u.id 
    AND k.is_active = true
);

-- 7. トラブルシューティング
-- ============================================================
SELECT '========== トラブルシューティング ==========' as section;

-- api_keysテーブルの必須カラム確認
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys'
    AND column_name IN ('id', 'user_id', 'key_prefix', 'key_hash', 'is_active')
ORDER BY column_name;

-- 8. 完了メッセージ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ APIキー生成スクリプト実行完了';
    RAISE NOTICE '';
    RAISE NOTICE '【確認事項】';
    RAISE NOTICE '- 最初の10ユーザーにAPIキーを生成しました';
    RAISE NOTICE '- デモユーザーの確認/作成を行いました';
    RAISE NOTICE '';
    RAISE NOTICE '【次のステップ】';
    RAISE NOTICE '1. 生成されたAPIキーを確認';
    RAISE NOTICE '2. 必要に応じてセクション4のコメントを外して全ユーザーに生成';
    RAISE NOTICE '3. Vercelアプリでログインテスト';
    RAISE NOTICE '============================================================';
END $$;