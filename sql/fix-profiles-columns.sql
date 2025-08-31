-- ============================================================
-- profilesテーブルのカラム修正SQL
-- full_nameカラムが存在しないエラーを修正
-- ============================================================

-- 1. 現在のprofilesテーブル構造を確認
-- ============================================================
SELECT '========== 現在のprofiles構造 ==========' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. profilesテーブルが存在しない場合は作成
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    company_name TEXT,
    plan TEXT DEFAULT 'free',
    api_quota_per_day INTEGER DEFAULT 100,
    api_quota_per_month INTEGER DEFAULT 3000,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 不足しているカラムを追加
-- ============================================================
DO $$
BEGIN
    -- emailカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
        -- auth.usersからメールアドレスをコピー
        UPDATE profiles p 
        SET email = u.email 
        FROM auth.users u 
        WHERE p.id = u.id AND p.email IS NULL;
    END IF;

    -- full_nameカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;

    -- company_nameカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'company_name') THEN
        ALTER TABLE profiles ADD COLUMN company_name TEXT;
    END IF;

    -- planカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'plan') THEN
        ALTER TABLE profiles ADD COLUMN plan TEXT DEFAULT 'free';
    END IF;

    -- api_quota_per_dayカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'api_quota_per_day') THEN
        ALTER TABLE profiles ADD COLUMN api_quota_per_day INTEGER DEFAULT 100;
    END IF;

    -- api_quota_per_monthカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'api_quota_per_month') THEN
        ALTER TABLE profiles ADD COLUMN api_quota_per_month INTEGER DEFAULT 3000;
    END IF;

    -- created_atカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- updated_atカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 4. 既存のauth.usersからデータを同期
-- ============================================================
DO $$
DECLARE
    v_user RECORD;
BEGIN
    -- auth.usersの全ユーザーをループ
    FOR v_user IN SELECT id, email, raw_user_meta_data, created_at FROM auth.users
    LOOP
        -- profilesにレコードを挿入または更新
        INSERT INTO profiles (
            id, 
            email, 
            full_name,
            company_name,
            plan,
            created_at
        ) VALUES (
            v_user.id,
            v_user.email,
            COALESCE(
                v_user.raw_user_meta_data->>'full_name',
                v_user.raw_user_meta_data->>'name',
                ''
            ),
            v_user.raw_user_meta_data->>'company',
            COALESCE(v_user.raw_user_meta_data->>'plan', 'free'),
            v_user.created_at
        )
        ON CONFLICT (id) DO UPDATE SET
            email = COALESCE(EXCLUDED.email, profiles.email),
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
            plan = COALESCE(EXCLUDED.plan, profiles.plan);
    END LOOP;
    
    RAISE NOTICE 'auth.usersからprofilesへのデータ同期完了';
END $$;

-- 5. 修正されたトリガー関数
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- profilesテーブルに挿入
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        company_name, 
        plan,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            ''
        ),
        NEW.raw_user_meta_data->>'company',
        COALESCE(NEW.raw_user_meta_data->>'plan', 'free'),
        NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
        plan = COALESCE(EXCLUDED.plan, profiles.plan);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. 更新時刻トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. RLSポリシーの確認と修正
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 新しいポリシーを作成
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 8. 修正後の構造確認
-- ============================================================
SELECT '========== 修正後のprofiles構造 ==========' as section;

SELECT 
    column_name,
    data_type,
    CASE WHEN is_nullable = 'YES' THEN 'NULL可' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 9. データ確認（安全なクエリ）
-- ============================================================
SELECT '========== 最近のユーザー（最新5件） ==========' as section;

SELECT 
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'profiles' AND column_name = 'full_name')
        THEN p.full_name 
        ELSE 'N/A'
    END as full_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'profiles' AND column_name = 'plan')
        THEN p.plan 
        ELSE 'N/A'
    END as plan,
    (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id) as api_key_count
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 10. 完了メッセージ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ profilesテーブルの修正完了';
    RAISE NOTICE '';
    RAISE NOTICE '【追加/修正されたカラム】';
    RAISE NOTICE '- email';
    RAISE NOTICE '- full_name';
    RAISE NOTICE '- company_name';
    RAISE NOTICE '- plan';
    RAISE NOTICE '- api_quota_per_day';
    RAISE NOTICE '- api_quota_per_month';
    RAISE NOTICE '- created_at';
    RAISE NOTICE '- updated_at';
    RAISE NOTICE '';
    RAISE NOTICE '【データ同期】';
    RAISE NOTICE '- auth.usersから既存ユーザーのデータを同期済み';
    RAISE NOTICE '- 新規ユーザーは自動的にprofilesに追加されます';
    RAISE NOTICE '============================================================';
END $$;