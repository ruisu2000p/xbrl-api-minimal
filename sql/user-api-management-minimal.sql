-- ============================================================
-- XBRL API 最小限のテーブル修正SQL
-- 既存のテーブルに必要なカラムを追加
-- ============================================================

-- 1. まず既存のテーブル構造を確認してカラムを追加
-- ============================================================

-- api_keysテーブルのカラム追加
DO $$
BEGIN
  -- created_atカラムが存在しない場合は追加
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'created_at') THEN
      ALTER TABLE api_keys ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- updated_atカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'updated_at') THEN
      ALTER TABLE api_keys ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- nameカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'name') THEN
      ALTER TABLE api_keys ADD COLUMN name TEXT DEFAULT 'API Key';
    END IF;
    
    -- permissionsカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'permissions') THEN
      ALTER TABLE api_keys ADD COLUMN permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb;
    END IF;
    
    -- rate_limit_per_minuteカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_minute') THEN
      ALTER TABLE api_keys ADD COLUMN rate_limit_per_minute INTEGER DEFAULT 60;
    END IF;
    
    -- rate_limit_per_hourカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_hour') THEN
      ALTER TABLE api_keys ADD COLUMN rate_limit_per_hour INTEGER DEFAULT 1000;
    END IF;
    
    -- rate_limit_per_dayカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'rate_limit_per_day') THEN
      ALTER TABLE api_keys ADD COLUMN rate_limit_per_day INTEGER DEFAULT 10000;
    END IF;
    
    -- expires_atカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'expires_at') THEN
      ALTER TABLE api_keys ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    
    -- last_used_atカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' AND column_name = 'last_used_at') THEN
      ALTER TABLE api_keys ADD COLUMN last_used_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- api_usageテーブルのカラム追加
DO $$
BEGIN
  -- created_atカラムが存在しない場合は追加
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'created_at') THEN
      ALTER TABLE api_usage ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- endpointカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'endpoint') THEN
      ALTER TABLE api_usage ADD COLUMN endpoint TEXT DEFAULT '/api/v1/unknown';
    END IF;
    
    -- methodカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'method') THEN
      ALTER TABLE api_usage ADD COLUMN method TEXT DEFAULT 'GET';
    END IF;
    
    -- status_codeカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'status_code') THEN
      ALTER TABLE api_usage ADD COLUMN status_code INTEGER;
    END IF;
    
    -- response_time_msカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'response_time_ms') THEN
      ALTER TABLE api_usage ADD COLUMN response_time_ms INTEGER;
    END IF;
    
    -- request_size_bytesカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'request_size_bytes') THEN
      ALTER TABLE api_usage ADD COLUMN request_size_bytes INTEGER;
    END IF;
    
    -- response_size_bytesカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'response_size_bytes') THEN
      ALTER TABLE api_usage ADD COLUMN response_size_bytes INTEGER;
    END IF;
    
    -- ip_addressカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'ip_address') THEN
      ALTER TABLE api_usage ADD COLUMN ip_address INET;
    END IF;
    
    -- user_agentカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'user_agent') THEN
      ALTER TABLE api_usage ADD COLUMN user_agent TEXT;
    END IF;
    
    -- error_messageカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'error_message') THEN
      ALTER TABLE api_usage ADD COLUMN error_message TEXT;
    END IF;
    
    -- metadataカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage' AND column_name = 'metadata') THEN
      ALTER TABLE api_usage ADD COLUMN metadata JSONB;
    END IF;
  END IF;
END $$;

-- profilesテーブルのカラム追加
DO $$
BEGIN
  -- profilesテーブルが存在しない場合は作成
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE public.profiles (
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
  ELSE
    -- 既存のprofilesテーブルにカラムを追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
      ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
      ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email') THEN
      ALTER TABLE profiles ADD COLUMN email TEXT;
      -- emailカラムを追加後、auth.usersから値を取得
      UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id;
      -- NOT NULL制約を追加
      ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
      ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'company_name') THEN
      ALTER TABLE profiles ADD COLUMN company_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'plan') THEN
      ALTER TABLE profiles ADD COLUMN plan TEXT DEFAULT 'free' 
        CHECK (plan IN ('free', 'basic', 'pro', 'enterprise'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'api_quota_per_day') THEN
      ALTER TABLE profiles ADD COLUMN api_quota_per_day INTEGER DEFAULT 100;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'api_quota_per_month') THEN
      ALTER TABLE profiles ADD COLUMN api_quota_per_month INTEGER DEFAULT 3000;
    END IF;
  END IF;
END $$;

-- 2. インデックスを安全に作成
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);

-- 3. 基本的なビューを作成（エラーを避けるため単純化）
-- ============================================================

-- APIキーの基本情報ビュー
CREATE OR REPLACE VIEW api_keys_info AS
SELECT 
  k.id,
  k.user_id,
  COALESCE(k.name, 'API Key') as name,
  k.key_prefix,
  k.is_active,
  k.created_at,
  k.last_used_at
FROM api_keys k
WHERE k.is_active = true;

-- API使用状況の基本ビュー
CREATE OR REPLACE VIEW api_usage_recent AS
SELECT 
  u.id,
  u.api_key_id,
  u.user_id,
  COALESCE(u.endpoint, '/api/v1/unknown') as endpoint,
  COALESCE(u.method, 'GET') as method,
  u.status_code,
  u.response_time_ms,
  u.created_at
FROM api_usage u
WHERE u.created_at IS NOT NULL 
  AND u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC
LIMIT 1000;

-- 4. RLSポリシーを安全に設定
-- ============================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
CREATE POLICY "Users can create own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
CREATE POLICY "Users can update own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own usage" ON api_usage;
CREATE POLICY "Users can view own usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. 必要最小限の関数を作成
-- ============================================================

-- APIキー生成関数（シンプル版）
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

-- 更新時刻自動更新（シンプル版）
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'profiles' AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = NOW();
  END IF;
  
  IF TG_TABLE_NAME = 'api_keys' AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_keys' AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成（存在チェック付き）
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. データ確認用クエリ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'テーブル修正が完了しました';
  RAISE NOTICE '以下のテーブルが更新されました:';
  RAISE NOTICE '- api_keys (APIキー管理)';
  RAISE NOTICE '- api_usage (使用状況)';
  RAISE NOTICE '- profiles (ユーザープロファイル)';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '環境変数 KEY_PEPPER を設定してください';
  RAISE NOTICE '============================================================';
END $$;