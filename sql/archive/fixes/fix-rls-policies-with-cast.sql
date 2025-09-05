-- ============================================================
-- RLS（Row Level Security）ポリシー修正（型キャスト対応版）
-- UUID型の比較エラーを修正
-- ============================================================

-- 1. user_idカラムの型を確認して修正
-- ============================================================
DO $$
DECLARE
    v_user_id_type TEXT;
BEGIN
    -- api_keysテーブルのuser_idカラムの型を確認
    SELECT data_type INTO v_user_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND table_name = 'api_keys'
        AND column_name = 'user_id';
    
    IF v_user_id_type IS NOT NULL THEN
        RAISE NOTICE 'api_keys.user_id の型: %', v_user_id_type;
        
        -- もしuser_idがTEXT型の場合、UUID型に変換を試みる
        IF v_user_id_type = 'text' OR v_user_id_type = 'character varying' THEN
            RAISE NOTICE 'user_idをTEXTからUUIDに変換を試みます...';
            
            -- 一時的にRLSを無効化
            ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
            ALTER TABLE api_usage DISABLE ROW LEVEL SECURITY;
            
            -- 新しいカラムを追加
            ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id_uuid UUID;
            
            -- 既存のデータを変換（UUID形式の文字列の場合のみ）
            UPDATE api_keys 
            SET user_id_uuid = CASE 
                WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN user_id::UUID 
                ELSE NULL 
            END
            WHERE user_id IS NOT NULL;
            
            -- 古いカラムを削除して新しいカラムをリネーム
            ALTER TABLE api_keys DROP COLUMN user_id;
            ALTER TABLE api_keys RENAME COLUMN user_id_uuid TO user_id;
            
            -- RLSを再有効化
            ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
            ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
            
            RAISE NOTICE 'user_idの型変換が完了しました';
        END IF;
    END IF;
    
    -- api_usageテーブルも同様に確認
    SELECT data_type INTO v_user_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND table_name = 'api_usage'
        AND column_name = 'user_id';
    
    IF v_user_id_type = 'text' OR v_user_id_type = 'character varying' THEN
        RAISE NOTICE 'api_usage.user_idをTEXTからUUIDに変換を試みます...';
        
        ALTER TABLE api_usage DISABLE ROW LEVEL SECURITY;
        ALTER TABLE api_usage ADD COLUMN IF NOT EXISTS user_id_uuid UUID;
        
        UPDATE api_usage 
        SET user_id_uuid = CASE 
            WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN user_id::UUID 
            ELSE NULL 
        END
        WHERE user_id IS NOT NULL;
        
        ALTER TABLE api_usage DROP COLUMN user_id;
        ALTER TABLE api_usage RENAME COLUMN user_id_uuid TO user_id;
        ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. 既存の危険なポリシーを削除
-- ============================================================
DO $$
BEGIN
    -- api_keysの既存ポリシーを削除
    DROP POLICY IF EXISTS "Service role can manage all keys" ON api_keys;
    DROP POLICY IF EXISTS "Anon can insert keys" ON api_keys;
    DROP POLICY IF EXISTS "Anon can select keys" ON api_keys;
    DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
    DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
    DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
    DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
    
    -- api_usageの既存ポリシーを削除
    DROP POLICY IF EXISTS "Service role can manage all usage" ON api_usage;
    DROP POLICY IF EXISTS "Anon can manage usage" ON api_usage;
    DROP POLICY IF EXISTS "Users can view own usage" ON api_usage;
    DROP POLICY IF EXISTS "Service role can insert usage" ON api_usage;
    
    -- profilesの既存ポリシーも念のため削除
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    
    RAISE NOTICE '既存のRLSポリシーを削除しました';
END $$;

-- 3. RLSを有効化
-- ============================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. profilesテーブルのポリシー（型キャスト対応）
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

-- ユーザーは自分のプロファイルを作成可能
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 5. api_keysテーブルのポリシー（型キャスト対応）
-- ============================================================
DO $$
DECLARE
    v_user_id_type TEXT;
BEGIN
    -- user_idカラムの現在の型を確認
    SELECT data_type INTO v_user_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND table_name = 'api_keys'
        AND column_name = 'user_id';
    
    IF v_user_id_type = 'uuid' THEN
        -- UUID型の場合
        CREATE POLICY "Users can view own API keys" 
        ON api_keys FOR SELECT 
        USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can create own API keys" 
        ON api_keys FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update own API keys" 
        ON api_keys FOR UPDATE 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete own API keys" 
        ON api_keys FOR DELETE 
        USING (auth.uid() = user_id);
        
    ELSIF v_user_id_type IN ('text', 'character varying') THEN
        -- TEXT型の場合（型キャスト使用）
        CREATE POLICY "Users can view own API keys" 
        ON api_keys FOR SELECT 
        USING (auth.uid()::TEXT = user_id);
        
        CREATE POLICY "Users can create own API keys" 
        ON api_keys FOR INSERT 
        WITH CHECK (auth.uid()::TEXT = user_id);
        
        CREATE POLICY "Users can update own API keys" 
        ON api_keys FOR UPDATE 
        USING (auth.uid()::TEXT = user_id)
        WITH CHECK (auth.uid()::TEXT = user_id);
        
        CREATE POLICY "Users can delete own API keys" 
        ON api_keys FOR DELETE 
        USING (auth.uid()::TEXT = user_id);
    ELSE
        RAISE NOTICE 'user_id型が不明です: %', v_user_id_type;
    END IF;
END $$;

-- 6. api_usageテーブルのポリシー（型キャスト対応）
-- ============================================================
DO $$
DECLARE
    v_user_id_type TEXT;
BEGIN
    -- user_idカラムの現在の型を確認
    SELECT data_type INTO v_user_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
        AND table_name = 'api_usage'
        AND column_name = 'user_id';
    
    IF v_user_id_type = 'uuid' THEN
        -- UUID型の場合
        CREATE POLICY "Users can view own usage" 
        ON api_usage FOR SELECT 
        USING (auth.uid() = user_id);
        
    ELSIF v_user_id_type IN ('text', 'character varying') THEN
        -- TEXT型の場合（型キャスト使用）
        CREATE POLICY "Users can view own usage" 
        ON api_usage FOR SELECT 
        USING (auth.uid()::TEXT = user_id);
    END IF;
    
    -- Service roleからの挿入は型に関係なく許可
    CREATE POLICY "Service role can insert usage" 
    ON api_usage FOR INSERT 
    WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role' OR
        current_setting('request.jwt.claim.role', true) = 'service_role'
    );
END $$;

-- 7. 追加のセキュリティ対策
-- ============================================================

-- rate_limit_countersテーブルがある場合
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limit_counters') THEN
        ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Service role manages rate limits" ON rate_limit_counters;
        CREATE POLICY "Service role manages rate limits" 
        ON rate_limit_counters FOR ALL 
        USING (
            auth.jwt() ->> 'role' = 'service_role' OR
            current_setting('request.jwt.claim.role', true) = 'service_role'
        )
        WITH CHECK (
            auth.jwt() ->> 'role' = 'service_role' OR
            current_setting('request.jwt.claim.role', true) = 'service_role'
        );
    END IF;
END $$;

-- subscription_plansテーブルがある場合
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can view plans" ON subscription_plans;
        CREATE POLICY "Anyone can view plans" 
        ON subscription_plans FOR SELECT 
        USING (true);
        
        DROP POLICY IF EXISTS "Service role manages plans" ON subscription_plans;
        CREATE POLICY "Service role manages plans" 
        ON subscription_plans FOR ALL 
        USING (
            auth.jwt() ->> 'role' = 'service_role' OR
            current_setting('request.jwt.claim.role', true) = 'service_role'
        );
    END IF;
END $$;

-- 8. 現在のRLSポリシーを確認
-- ============================================================
SELECT 
    '========== 新しいRLSポリシー ==========' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    CASE 
        WHEN qual IS NULL THEN 'なし'
        WHEN qual = 'true' THEN '全許可（公開情報）'
        WHEN qual LIKE '%auth.uid()%' THEN '✅ ユーザー認証'
        WHEN qual LIKE '%service_role%' THEN '⚠️ Service roleのみ'
        ELSE substring(qual::text, 1, 50) || '...'
    END as condition
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('api_keys', 'api_usage', 'profiles', 'rate_limit_counters', 'subscription_plans')
ORDER BY tablename, policyname;

-- 9. 型情報の確認
-- ============================================================
SELECT 
    '========== カラム型情報 ==========' as section;

SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN data_type = 'uuid' THEN '✅ UUID型'
        WHEN data_type IN ('text', 'character varying') THEN '⚠️ TEXT型（キャスト必要）'
        ELSE data_type
    END as type_status
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('api_keys', 'api_usage', 'profiles')
    AND column_name IN ('id', 'user_id', 'api_key_id')
ORDER BY table_name, column_name;

-- 10. 完了メッセージ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RLSポリシーの修正が完了しました（型キャスト対応）';
    RAISE NOTICE '';
    RAISE NOTICE '【重要な変更】';
    RAISE NOTICE '1. UUID/TEXT型の違いを自動検出してポリシーを適用';
    RAISE NOTICE '2. 必要に応じて型キャストを使用';
    RAISE NOTICE '3. Service roleの判定方法を改善';
    RAISE NOTICE '';
    RAISE NOTICE '【確認事項】';
    RAISE NOTICE '- user_idカラムの型を確認してください';
    RAISE NOTICE '- UUID型が推奨されますが、TEXT型でも動作します';
    RAISE NOTICE '============================================================';
END $$;