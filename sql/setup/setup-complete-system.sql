-- ============================================================
-- XBRL API 完全セットアップSQL
-- UUID型統一環境用（Supabase Project: wpwqxhyiglbtlaimrjrx）
-- ============================================================

-- 1. 必要なテーブルの作成・修正
-- ============================================================

-- profilesテーブル（存在しない場合作成）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'name') THEN
    ALTER TABLE api_keys ADD COLUMN name TEXT DEFAULT 'API Key';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'permissions') THEN
    ALTER TABLE api_keys ADD COLUMN permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_minute') THEN
    ALTER TABLE api_keys ADD COLUMN rate_limit_per_minute INTEGER DEFAULT 60;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_hour') THEN
    ALTER TABLE api_keys ADD COLUMN rate_limit_per_hour INTEGER DEFAULT 1000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_day') THEN
    ALTER TABLE api_keys ADD COLUMN rate_limit_per_day INTEGER DEFAULT 10000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'expires_at') THEN
    ALTER TABLE api_keys ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'last_used_at') THEN
    ALTER TABLE api_keys ADD COLUMN last_used_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'created_at') THEN
    ALTER TABLE api_keys ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_keys' AND column_name = 'updated_at') THEN
    ALTER TABLE api_keys ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- api_usageテーブルに必要なカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_usage' AND column_name = 'created_at') THEN
    ALTER TABLE api_usage ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_usage' AND column_name = 'endpoint') THEN
    ALTER TABLE api_usage ADD COLUMN endpoint TEXT DEFAULT '/api/v1/unknown';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_usage' AND column_name = 'method') THEN
    ALTER TABLE api_usage ADD COLUMN method TEXT DEFAULT 'GET';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_usage' AND column_name = 'status_code') THEN
    ALTER TABLE api_usage ADD COLUMN status_code INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'api_usage' AND column_name = 'response_time_ms') THEN
    ALTER TABLE api_usage ADD COLUMN response_time_ms INTEGER;
  END IF;
END $$;

-- 2. サブスクリプションプランテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  api_quota_per_day INTEGER NOT NULL,
  api_quota_per_month INTEGER NOT NULL,
  rate_limit_per_minute INTEGER NOT NULL,
  rate_limit_per_hour INTEGER NOT NULL,
  features JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルトプランの挿入/更新
INSERT INTO subscription_plans (id, name, price_monthly, api_quota_per_day, api_quota_per_month, rate_limit_per_minute, rate_limit_per_hour, features) VALUES
  ('free', 'Free', 0, 100, 3000, 10, 100, '{"data_years": 1, "support": "community", "sla": false}'::jsonb),
  ('basic', 'Basic', 1080, 500, 15000, 30, 500, '{"data_years": 3, "support": "email", "sla": false}'::jsonb),
  ('pro', 'Pro', 2980, 10000, 300000, 100, 10000, '{"data_years": 10, "support": "priority", "sla": true}'::jsonb),
  ('enterprise', 'Enterprise', 9800, 100000, 3000000, 1000, 100000, '{"data_years": -1, "support": "dedicated", "sla": true, "custom_integration": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  api_quota_per_day = EXCLUDED.api_quota_per_day,
  api_quota_per_month = EXCLUDED.api_quota_per_month,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  rate_limit_per_hour = EXCLUDED.rate_limit_per_hour,
  features = EXCLUDED.features;

-- 3. 安全なRLSポリシー設定（UUID型用）
-- ============================================================

-- 既存のポリシーをすべて削除
DO $$
BEGIN
  -- api_keys
  DROP POLICY IF EXISTS "Service role can manage all keys" ON api_keys;
  DROP POLICY IF EXISTS "Anon can insert keys" ON api_keys;
  DROP POLICY IF EXISTS "Anon can select keys" ON api_keys;
  DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
  DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
  DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
  DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
  
  -- api_usage
  DROP POLICY IF EXISTS "Service role can manage all usage" ON api_usage;
  DROP POLICY IF EXISTS "Anon can manage usage" ON api_usage;
  DROP POLICY IF EXISTS "Users can view own usage" ON api_usage;
  DROP POLICY IF EXISTS "Service role can insert usage" ON api_usage;
  
  -- profiles
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
END $$;

-- RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- profilesテーブルのポリシー
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- api_keysテーブルのポリシー（UUID型）
CREATE POLICY "Users can view own API keys" 
  ON api_keys FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys" 
  ON api_keys FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" 
  ON api_keys FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" 
  ON api_keys FOR DELETE 
  USING (auth.uid() = user_id);

-- api_usageテーブルのポリシー（UUID型）
CREATE POLICY "Users can view own usage" 
  ON api_usage FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage" 
  ON api_usage FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- subscription_plansテーブルのポリシー
CREATE POLICY "Anyone can view plans" 
  ON subscription_plans FOR SELECT 
  USING (true);

-- 4. ヘルパー関数
-- ============================================================

-- APIキー生成関数
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  key_part TEXT;
BEGIN
  key_part := encode(gen_random_bytes(32), 'base64');
  key_part := replace(key_part, '+', '-');
  key_part := replace(key_part, '/', '_');
  key_part := replace(key_part, '=', '');
  RETURN 'xbrl_live_' || substring(key_part, 1, 32);
END;
$$ LANGUAGE plpgsql;

-- 更新時刻自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. プロファイル自動作成トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. インデックス作成
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);

-- 7. システム状態確認
-- ============================================================
SELECT '========== システム構成確認 ==========' as section;

-- テーブル構造確認
WITH table_check AS (
  SELECT 
    'profiles' as table_name,
    COUNT(*) as column_count,
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'profiles') as has_rls
  FROM information_schema.columns
  WHERE table_name = 'profiles'
  UNION ALL
  SELECT 
    'api_keys',
    COUNT(*),
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'api_keys')
  FROM information_schema.columns
  WHERE table_name = 'api_keys'
  UNION ALL
  SELECT 
    'api_usage',
    COUNT(*),
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'api_usage')
  FROM information_schema.columns
  WHERE table_name = 'api_usage'
)
SELECT 
  table_name,
  column_count as columns,
  CASE WHEN has_rls THEN '✅ RLS有効' ELSE '❌ RLS無効' END as security
FROM table_check;

-- RLSポリシー確認
SELECT '========== RLSポリシー ==========' as section;

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN '✅ ユーザー認証'
    WHEN qual LIKE '%service_role%' THEN '⚠️ Service role'
    WHEN qual = 'true' THEN '📢 公開'
    ELSE '❓ その他'
  END as type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'api_keys', 'api_usage', 'subscription_plans')
ORDER BY tablename, policyname;

-- 8. 完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ XBRL API システムセットアップ完了';
  RAISE NOTICE '';
  RAISE NOTICE '【システム構成】';
  RAISE NOTICE 'Vercel (https://xbrl-api-minimal.vercel.app/)';
  RAISE NOTICE '  ↓';
  RAISE NOTICE 'Supabase Auth (認証)';
  RAISE NOTICE '  ↓';
  RAISE NOTICE 'profiles テーブル (ユーザー情報)';
  RAISE NOTICE '  ↓';
  RAISE NOTICE 'api_keys テーブル (APIキー管理)';
  RAISE NOTICE '  ↓';
  RAISE NOTICE 'api_usage テーブル (使用状況追跡)';
  RAISE NOTICE '';
  RAISE NOTICE '【セキュリティ】';
  RAISE NOTICE '- RLS有効（ユーザー認証ベース）';
  RAISE NOTICE '- UUID型統一';
  RAISE NOTICE '- HMAC-SHA256ハッシュ化';
  RAISE NOTICE '';
  RAISE NOTICE '【次のステップ】';
  RAISE NOTICE '1. 環境変数 KEY_PEPPER を設定';
  RAISE NOTICE '2. Edge Functions をデプロイ';
  RAISE NOTICE '3. Vercelアプリケーションをテスト';
  RAISE NOTICE '============================================================';
END $$;