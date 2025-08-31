-- ============================================================
-- RLS（Row Level Security）ポリシー修正
-- 匿名アクセスを制限し、ユーザー認証ベースのポリシーに変更
-- ============================================================

-- 1. 既存の危険なポリシーを削除
-- ============================================================
DO $$
BEGIN
    -- api_keysの既存ポリシーを削除
    DROP POLICY IF EXISTS "Service role can manage all keys" ON api_keys;
    DROP POLICY IF EXISTS "Anon can insert keys" ON api_keys;
    DROP POLICY IF EXISTS "Anon can select keys" ON api_keys;
    
    -- api_usageの既存ポリシーを削除
    DROP POLICY IF EXISTS "Service role can manage all usage" ON api_usage;
    DROP POLICY IF EXISTS "Anon can manage usage" ON api_usage;
    
    -- profilesの既存ポリシーも念のため削除
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    
    RAISE NOTICE '既存のRLSポリシーを削除しました';
END $$;

-- 2. RLSを有効化（既に有効な場合もエラーにならない）
-- ============================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. profilesテーブルのポリシー（ユーザー認証ベース）
-- ============================================================

-- ユーザーは自分のプロファイルのみ参照可能
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- ユーザーは自分のプロファイルのみ更新可能
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ユーザーは自分のプロファイルを作成可能（サインアップ時）
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. api_keysテーブルのポリシー（ユーザー認証ベース）
-- ============================================================

-- ユーザーは自分のAPIキーのみ参照可能
CREATE POLICY "Users can view own API keys" 
ON api_keys FOR SELECT 
USING (auth.uid() = user_id);

-- ユーザーは自分のAPIキーのみ作成可能
CREATE POLICY "Users can create own API keys" 
ON api_keys FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のAPIキーのみ更新可能（無効化など）
CREATE POLICY "Users can update own API keys" 
ON api_keys FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のAPIキーのみ削除可能
CREATE POLICY "Users can delete own API keys" 
ON api_keys FOR DELETE 
USING (auth.uid() = user_id);

-- 5. api_usageテーブルのポリシー（ユーザー認証ベース）
-- ============================================================

-- ユーザーは自分の使用状況のみ参照可能
CREATE POLICY "Users can view own usage" 
ON api_usage FOR SELECT 
USING (auth.uid() = user_id);

-- Edge Functionsからの使用状況記録用（service_roleのみ）
-- 注：これはSupabase Edge Functionsがservice_roleキーで動作するために必要
CREATE POLICY "Service role can insert usage" 
ON api_usage FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- 6. 追加のセキュリティ対策
-- ============================================================

-- rate_limit_countersテーブルがある場合のポリシー
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limit_counters') THEN
        ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;
        
        -- Service roleのみがレート制限カウンターを管理
        DROP POLICY IF EXISTS "Service role manages rate limits" ON rate_limit_counters;
        CREATE POLICY "Service role manages rate limits" 
        ON rate_limit_counters FOR ALL 
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
        
        RAISE NOTICE 'rate_limit_countersのRLSポリシーを設定しました';
    END IF;
END $$;

-- subscription_plansテーブルがある場合のポリシー
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
        
        -- 全ユーザーがプラン情報を参照可能（料金表として公開情報）
        DROP POLICY IF EXISTS "Anyone can view plans" ON subscription_plans;
        CREATE POLICY "Anyone can view plans" 
        ON subscription_plans FOR SELECT 
        USING (true);
        
        -- Service roleのみがプランを管理
        DROP POLICY IF EXISTS "Service role manages plans" ON subscription_plans;
        CREATE POLICY "Service role manages plans" 
        ON subscription_plans FOR ALL 
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
        
        RAISE NOTICE 'subscription_plansのRLSポリシーを設定しました';
    END IF;
END $$;

-- 7. 現在のRLSポリシーを確認
-- ============================================================
SELECT 
    '========== 新しいRLSポリシー ==========' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NULL THEN 'なし'
        WHEN qual = 'true' THEN '全許可（危険）'
        WHEN qual LIKE '%auth.uid()%' THEN '✅ ユーザー認証'
        WHEN qual LIKE '%service_role%' THEN '⚠️ Service roleのみ'
        ELSE qual::text
    END as condition
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('api_keys', 'api_usage', 'profiles', 'rate_limit_counters', 'subscription_plans')
ORDER BY tablename, policyname;

-- 8. セキュリティ診断
-- ============================================================
SELECT 
    '========== セキュリティ診断 ==========' as section;

WITH security_check AS (
    SELECT 
        tablename,
        COUNT(*) as policy_count,
        COUNT(CASE WHEN qual = 'true' THEN 1 END) as dangerous_policies,
        COUNT(CASE WHEN qual LIKE '%auth.uid()%' THEN 1 END) as user_auth_policies
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename IN ('api_keys', 'api_usage', 'profiles')
    GROUP BY tablename
)
SELECT 
    tablename,
    policy_count,
    CASE 
        WHEN dangerous_policies > 0 THEN '❌ 危険：全許可ポリシーあり'
        WHEN user_auth_policies = 0 THEN '⚠️ 警告：ユーザー認証なし'
        WHEN policy_count = 0 THEN '❌ ポリシーなし'
        ELSE '✅ 安全'
    END as security_status,
    user_auth_policies as auth_policies,
    dangerous_policies as unsafe_policies
FROM security_check
ORDER BY tablename;

-- 9. 推奨事項
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RLSポリシーの修正が完了しました';
    RAISE NOTICE '';
    RAISE NOTICE '【重要な変更】';
    RAISE NOTICE '1. 匿名アクセス（Anon）を制限しました';
    RAISE NOTICE '2. ユーザー認証ベースのポリシーに変更しました';
    RAISE NOTICE '3. 各ユーザーは自分のデータのみアクセス可能です';
    RAISE NOTICE '';
    RAISE NOTICE '【確認事項】';
    RAISE NOTICE '- Supabase Authenticationが有効になっていること';
    RAISE NOTICE '- Edge FunctionsがService Roleキーを使用していること';
    RAISE NOTICE '- フロントエンドがユーザー認証を実装していること';
    RAISE NOTICE '============================================================';
END $$;