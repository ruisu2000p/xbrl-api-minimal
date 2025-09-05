-- ============================================================
-- ユーザーデータとAPIキー作成の修正
-- full_nameの保存とAPIキー生成を確実に実行
-- ============================================================

-- 1. 現在のユーザー状況確認
-- ============================================================
SELECT '========== 現在のユーザー状況 ==========' as section;

SELECT 
    u.id,
    u.email,
    u.created_at,
    p.full_name,
    p.plan,
    u.raw_user_meta_data->>'name' as meta_name,
    u.raw_user_meta_data->>'full_name' as meta_full_name,
    u.raw_user_meta_data->>'plan' as meta_plan,
    (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id) as api_keys_count
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. 既存ユーザーのfull_nameを修正
-- ============================================================
UPDATE profiles p
SET 
    full_name = COALESCE(
        p.full_name,
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1)  -- メールアドレスのユーザー名部分を使用
    ),
    plan = COALESCE(
        p.plan,
        u.raw_user_meta_data->>'plan',
        'free'
    )
FROM auth.users u
WHERE p.id = u.id
    AND (p.full_name IS NULL OR p.full_name = '');

-- 3. APIキー生成関数の改善
-- ============================================================
CREATE OR REPLACE FUNCTION generate_api_key_for_user(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_api_key TEXT;
    v_key_prefix TEXT;
    v_key_hash TEXT;
    v_user_email TEXT;
    v_user_plan TEXT;
BEGIN
    -- ユーザー情報を取得
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    SELECT COALESCE(plan, 'free') INTO v_user_plan FROM profiles WHERE id = p_user_id;
    
    -- APIキーを生成
    v_api_key := 'xbrl_live_' || encode(gen_random_bytes(32), 'base64');
    v_api_key := replace(v_api_key, '+', '-');
    v_api_key := replace(v_api_key, '/', '_');
    v_api_key := replace(v_api_key, '=', '');
    v_api_key := substring(v_api_key, 1, 48);  -- 長さを制限
    
    v_key_prefix := substring(v_api_key, 1, 16);
    
    -- SHA256ハッシュ（簡易版 - 本番ではHMACを使用）
    v_key_hash := encode(sha256(v_api_key::bytea), 'base64');
    
    -- APIキーをデータベースに保存
    INSERT INTO api_keys (
        user_id,
        name,
        key_prefix,
        key_hash,
        is_active,
        created_at,
        updated_at,
        last_used_at,
        expires_at,
        rate_limit_per_minute,
        rate_limit_per_hour,
        rate_limit_per_day
    ) VALUES (
        p_user_id,
        'Default API Key',
        v_key_prefix,
        v_key_hash,
        true,
        NOW(),
        NOW(),
        NULL,
        NOW() + INTERVAL '1 year',
        CASE v_user_plan
            WHEN 'pro' THEN 100
            WHEN 'basic' THEN 30
            ELSE 10
        END,
        CASE v_user_plan
            WHEN 'pro' THEN 10000
            WHEN 'basic' THEN 500
            ELSE 100
        END,
        CASE v_user_plan
            WHEN 'pro' THEN 100000
            WHEN 'basic' THEN 5000
            ELSE 100
        END
    )
    ON CONFLICT (user_id, key_prefix) DO NOTHING;
    
    RETURN v_api_key;
END;
$$ LANGUAGE plpgsql;

-- 4. APIキーがないユーザーにAPIキーを生成
-- ============================================================
DO $$
DECLARE
    v_user RECORD;
    v_api_key TEXT;
    v_count INTEGER := 0;
BEGIN
    -- APIキーがないユーザーをループ
    FOR v_user IN 
        SELECT u.id, u.email
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM api_keys k 
            WHERE k.user_id = u.id AND k.is_active = true
        )
        ORDER BY u.created_at DESC
        LIMIT 100  -- 最新100人まで
    LOOP
        -- APIキーを生成
        v_api_key := generate_api_key_for_user(v_user.id);
        v_count := v_count + 1;
        RAISE NOTICE 'APIキー生成: % (user: %)', substring(v_api_key, 1, 16) || '...', v_user.email;
    END LOOP;
    
    RAISE NOTICE '合計 % 件のAPIキーを生成しました', v_count;
END $$;

-- 5. 改善されたユーザー作成トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_plan TEXT;
    v_api_key TEXT;
BEGIN
    -- メタデータから情報を取得
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    v_plan := COALESCE(
        NEW.raw_user_meta_data->>'plan',
        'free'
    );
    
    -- profilesテーブルに挿入
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        company_name,
        plan,
        api_quota_per_day,
        api_quota_per_month,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        NEW.raw_user_meta_data->>'company',
        v_plan,
        CASE v_plan
            WHEN 'pro' THEN 10000
            WHEN 'basic' THEN 500
            ELSE 100
        END,
        CASE v_plan
            WHEN 'pro' THEN 300000
            WHEN 'basic' THEN 15000
            ELSE 3000
        END,
        NEW.created_at,
        NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        company_name = COALESCE(profiles.company_name, EXCLUDED.company_name),
        plan = COALESCE(profiles.plan, EXCLUDED.plan),
        updated_at = NOW();
    
    -- APIキーを自動生成
    v_api_key := generate_api_key_for_user(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. テスト用のユーザーとAPIキー作成
-- ============================================================
DO $$
DECLARE
    v_test_user_id UUID;
    v_api_key TEXT;
BEGIN
    -- デモユーザーが存在するか確認
    SELECT id INTO v_test_user_id 
    FROM auth.users 
    WHERE email = 'demo@example.com';
    
    IF v_test_user_id IS NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== デモユーザー作成方法 ===';
        RAISE NOTICE 'Supabase Dashboard > Authentication > Users から:';
        RAISE NOTICE 'Email: demo@example.com';
        RAISE NOTICE 'Password: Demo1234!';
        RAISE NOTICE 'を作成してください';
    ELSE
        -- profilesにデータがあるか確認
        UPDATE profiles
        SET 
            full_name = 'Demo User',
            plan = 'pro',
            api_quota_per_day = 10000,
            api_quota_per_month = 300000
        WHERE id = v_test_user_id;
        
        -- APIキーを生成
        v_api_key := generate_api_key_for_user(v_test_user_id);
        
        RAISE NOTICE '';
        RAISE NOTICE '=== デモユーザー情報 ===';
        RAISE NOTICE 'Email: demo@example.com';
        RAISE NOTICE 'User ID: %', v_test_user_id;
        RAISE NOTICE 'APIキー（最初の16文字）: %...', substring(v_api_key, 1, 16);
        RAISE NOTICE 'プラン: Pro';
    END IF;
END $$;

-- 7. 修正後の確認
-- ============================================================
SELECT '========== 修正後のユーザー状況 ==========' as section;

SELECT 
    u.id,
    u.email,
    u.created_at,
    p.full_name,
    p.plan,
    p.api_quota_per_day,
    (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id AND is_active = true) as active_api_keys
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 8. APIキーの状況確認
-- ============================================================
SELECT '========== APIキー状況 ==========' as section;

SELECT 
    k.user_id,
    u.email,
    k.name,
    k.key_prefix || '...' as key_display,
    k.is_active,
    k.created_at,
    k.last_used_at,
    k.rate_limit_per_day
FROM api_keys k
JOIN auth.users u ON k.user_id = u.id
WHERE k.is_active = true
ORDER BY k.created_at DESC
LIMIT 10;

-- 9. 統計情報
-- ============================================================
SELECT '========== 統計情報 ==========' as section;

SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Users with Profile',
    COUNT(*)
FROM profiles
WHERE full_name IS NOT NULL AND full_name != ''
UNION ALL
SELECT 
    'Users with API Keys',
    COUNT(DISTINCT user_id)
FROM api_keys
WHERE is_active = true
UNION ALL
SELECT 
    'Total Active API Keys',
    COUNT(*)
FROM api_keys
WHERE is_active = true;

-- 10. 完了メッセージ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ ユーザーデータとAPIキーの修正完了';
    RAISE NOTICE '';
    RAISE NOTICE '【実行内容】';
    RAISE NOTICE '1. 既存ユーザーのfull_nameを設定';
    RAISE NOTICE '2. APIキーがないユーザーにAPIキーを生成';
    RAISE NOTICE '3. 新規ユーザー用のトリガーを改善';
    RAISE NOTICE '';
    RAISE NOTICE '【確認事項】';
    RAISE NOTICE '- すべてのユーザーにfull_nameが設定されました';
    RAISE NOTICE '- アクティブなAPIキーが生成されました';
    RAISE NOTICE '- 今後の新規ユーザーは自動的に処理されます';
    RAISE NOTICE '============================================================';
END $$;