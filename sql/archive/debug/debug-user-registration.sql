-- ============================================================
-- ユーザー登録デバッグ・修正SQL
-- Supabase Project: wpwqxhyiglbtlaimrjrx
-- ============================================================

-- 1. 現在の設定確認
-- ============================================================
SELECT '========== Auth設定確認 ==========' as section;

-- Auth設定を確認（Supabase Dashboard > Authentication > Settingsで確認）
-- 以下を確認：
-- - Email Auth が有効か
-- - Email Confirmations が無効か（開発時は無効推奨）
-- - Auto-confirm users が有効か（開発時は有効推奨）

-- 2. テーブル構造の確認
-- ============================================================
SELECT '========== テーブル構造確認 ==========' as section;

-- usersテーブルが存在するか確認
SELECT 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'users') as users_table_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') as profiles_table_exists;

-- api_keysテーブルのカラム確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;

-- 3. 必要なテーブルとカラムの作成
-- ============================================================

-- usersテーブル（レガシー互換用）
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- profilesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company_name TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise', 'beta')),
    api_quota_per_day INTEGER DEFAULT 100,
    api_quota_per_month INTEGER DEFAULT 3000,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_keysテーブルに必要なカラムを追加
DO $$
BEGIN
    -- key_suffixカラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'key_suffix') THEN
        ALTER TABLE api_keys ADD COLUMN key_suffix TEXT;
    END IF;
    
    -- statusカラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'status') THEN
        ALTER TABLE api_keys ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    
    -- environmentカラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'environment') THEN
        ALTER TABLE api_keys ADD COLUMN environment TEXT DEFAULT 'production';
    END IF;
    
    -- metadataカラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'metadata') THEN
        ALTER TABLE api_keys ADD COLUMN metadata JSONB;
    END IF;
    
    -- created_byカラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'created_by') THEN
        ALTER TABLE api_keys ADD COLUMN created_by UUID;
    END IF;
    
    -- tierカラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'tier') THEN
        ALTER TABLE api_keys ADD COLUMN tier TEXT DEFAULT 'free';
    END IF;
    
    -- リクエストカウンター追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'total_requests') THEN
        ALTER TABLE api_keys ADD COLUMN total_requests BIGINT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'successful_requests') THEN
        ALTER TABLE api_keys ADD COLUMN successful_requests BIGINT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'failed_requests') THEN
        ALTER TABLE api_keys ADD COLUMN failed_requests BIGINT DEFAULT 0;
    END IF;
END $$;

-- 4. トリガー関数の修正（プロファイル自動作成）
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- profilesテーブルに挿入
    INSERT INTO public.profiles (id, email, full_name, company_name, plan)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'company',
        COALESCE(NEW.raw_user_meta_data->>'plan', 'free')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
        plan = COALESCE(EXCLUDED.plan, profiles.plan);
    
    -- usersテーブルにも挿入（互換性のため）
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. RLSポリシーの修正
-- ============================================================

-- usersテーブルのRLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" 
    ON users FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" 
    ON users FOR UPDATE 
    USING (auth.uid() = id);

-- profilesテーブルのRLS（既存を確認して再作成）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- api_keysテーブルのRLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own API keys" ON api_keys;
CREATE POLICY "Users can manage own API keys" 
    ON api_keys FOR ALL 
    USING (auth.uid() = user_id);

-- 6. テストユーザー作成（手動テスト用）
-- ============================================================
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- テストユーザーが存在しない場合のみ作成
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@example.com') THEN
        -- 注意：これはSupabase Dashboardから実行する必要があります
        -- auth.usersへの直接挿入は通常できません
        RAISE NOTICE 'テストユーザーを作成するには、Supabase Dashboard > Authentication > Users から手動で作成してください';
        RAISE NOTICE 'Email: test@example.com';
        RAISE NOTICE 'Password: Test1234!';
    ELSE
        SELECT id INTO v_user_id FROM auth.users WHERE email = 'test@example.com';
        RAISE NOTICE 'テストユーザーは既に存在します。ID: %', v_user_id;
    END IF;
END $$;

-- 7. 診断情報
-- ============================================================
SELECT '========== システム診断 ==========' as section;

-- auth.usersの件数
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- profilesの件数
SELECT COUNT(*) as profiles_count FROM profiles;

-- usersの件数
SELECT COUNT(*) as users_count FROM users;

-- api_keysの件数
SELECT COUNT(*) as api_keys_count FROM api_keys;

-- 最近作成されたユーザー
SELECT '========== 最近のユーザー（最新5件） ==========' as section;

SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.plan,
    (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id) as api_key_count
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 8. 完了メッセージ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ ユーザー登録システムの診断・修正完了';
    RAISE NOTICE '';
    RAISE NOTICE '【確認事項】';
    RAISE NOTICE '1. Supabase Dashboard > Authentication > Settings で:';
    RAISE NOTICE '   - Email Auth: 有効';
    RAISE NOTICE '   - Email Confirmations: 無効（開発時）';
    RAISE NOTICE '   - Auto-confirm users: 有効（開発時）';
    RAISE NOTICE '';
    RAISE NOTICE '2. 環境変数の確認:';
    RAISE NOTICE '   - NEXT_PUBLIC_SUPABASE_URL';
    RAISE NOTICE '   - NEXT_PUBLIC_SUPABASE_ANON_KEY';
    RAISE NOTICE '   - SUPABASE_SERVICE_ROLE_KEY';
    RAISE NOTICE '';
    RAISE NOTICE '3. テストユーザーでの動作確認:';
    RAISE NOTICE '   Email: test@example.com';
    RAISE NOTICE '   Password: Test1234!';
    RAISE NOTICE '============================================================';
END $$;