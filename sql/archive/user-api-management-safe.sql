-- ============================================================
-- XBRL API ユーザー登録・APIキー管理システム（安全版）
-- 既存のテーブル・インデックスをチェックしてから作成
-- ============================================================

-- 1. ユーザープロファイルテーブル（Supabase Authと連携）
-- ============================================================
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

-- 2. APIキー管理テーブル（既存の場合はスキップ）
-- ============================================================
DO $$ 
BEGIN
  -- api_keysテーブルが存在しない場合のみ作成
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    CREATE TABLE public.api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb,
      rate_limit_per_minute INTEGER DEFAULT 60,
      rate_limit_per_hour INTEGER DEFAULT 1000,
      rate_limit_per_day INTEGER DEFAULT 10000,
      expires_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- インデックス作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- 3. API使用状況記録テーブル（既存の場合はスキップ）
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage') THEN
    CREATE TABLE public.api_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER,
      request_size_bytes INTEGER,
      response_size_bytes INTEGER,
      ip_address INET,
      user_agent TEXT,
      error_message TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- パーティショニング用のインデックス（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- 4. レート制限カウンターテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'hour', 'day')),
  request_count INTEGER DEFAULT 0,
  PRIMARY KEY (api_key_id, window_start, window_type)
);

-- 5. サブスクリプションプランテーブル
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

-- デフォルトプランの挿入（存在しない場合のみ）
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
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- 6. 必要なカラムを追加（存在しない場合のみ）
-- ============================================================
DO $$
BEGIN
  -- api_keysテーブルに不足しているカラムを追加
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
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
  
  -- profilesテーブルに不足しているカラムを追加
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- company_nameカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'company_name') THEN
      ALTER TABLE profiles ADD COLUMN company_name TEXT;
    END IF;
    
    -- planカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'plan') THEN
      ALTER TABLE profiles ADD COLUMN plan TEXT DEFAULT 'free' 
        CHECK (plan IN ('free', 'basic', 'pro', 'enterprise'));
    END IF;
    
    -- api_quota_per_dayカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'api_quota_per_day') THEN
      ALTER TABLE profiles ADD COLUMN api_quota_per_day INTEGER DEFAULT 100;
    END IF;
    
    -- api_quota_per_monthカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'api_quota_per_month') THEN
      ALTER TABLE profiles ADD COLUMN api_quota_per_month INTEGER DEFAULT 3000;
    END IF;
    
    -- stripe_customer_idカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
      ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    -- stripe_subscription_idカラムが存在しない場合は追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id') THEN
      ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;
    END IF;
  END IF;
END $$;

-- 7. RLS (Row Level Security) ポリシー（存在しない場合のみ作成）
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
CREATE POLICY "Users can create own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
CREATE POLICY "Users can update own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
CREATE POLICY "Users can delete own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own usage" ON api_usage;
CREATE POLICY "Users can view own usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

-- 8. ヘルパー関数（存在しない場合のみ作成）
-- ============================================================
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  key_part TEXT;
BEGIN
  key_part := encode(gen_random_bytes(32), 'base64');
  key_part := replace(key_part, '+', '-');
  key_part := replace(key_part, '/', '_');
  key_part := replace(key_part, '=', '');
  RETURN 'xbrl_live_' || key_part;
END;
$$ LANGUAGE plpgsql;

-- レート制限チェック関数
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id UUID,
  p_window_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- ウィンドウの開始時刻を計算
  CASE p_window_type
    WHEN 'minute' THEN
      v_window_start := date_trunc('minute', NOW());
    WHEN 'hour' THEN
      v_window_start := date_trunc('hour', NOW());
    WHEN 'day' THEN
      v_window_start := date_trunc('day', NOW());
  END CASE;

  -- 現在のカウントを取得
  SELECT request_count INTO v_current_count
  FROM rate_limit_counters
  WHERE api_key_id = p_api_key_id
    AND window_start = v_window_start
    AND window_type = p_window_type;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  -- 制限値を取得
  SELECT 
    CASE p_window_type
      WHEN 'minute' THEN rate_limit_per_minute
      WHEN 'hour' THEN rate_limit_per_hour
      WHEN 'day' THEN rate_limit_per_day
    END INTO v_limit
  FROM api_keys
  WHERE id = p_api_key_id;

  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql;

-- レート制限カウンター増加関数
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_api_key_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_window_start_minute TIMESTAMPTZ;
  v_window_start_hour TIMESTAMPTZ;
  v_window_start_day TIMESTAMPTZ;
BEGIN
  v_window_start_minute := date_trunc('minute', NOW());
  v_window_start_hour := date_trunc('hour', NOW());
  v_window_start_day := date_trunc('day', NOW());

  -- 分単位のカウンター
  INSERT INTO rate_limit_counters (api_key_id, window_start, window_type, request_count)
  VALUES (p_api_key_id, v_window_start_minute, 'minute', 1)
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET request_count = rate_limit_counters.request_count + 1;

  -- 時間単位のカウンター
  INSERT INTO rate_limit_counters (api_key_id, window_start, window_type, request_count)
  VALUES (p_api_key_id, v_window_start_hour, 'hour', 1)
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET request_count = rate_limit_counters.request_count + 1;

  -- 日単位のカウンター
  INSERT INTO rate_limit_counters (api_key_id, window_start, window_type, request_count)
  VALUES (p_api_key_id, v_window_start_day, 'day', 1)
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET request_count = rate_limit_counters.request_count + 1;

  -- 最終使用時刻を更新
  UPDATE api_keys 
  SET last_used_at = NOW() 
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- 9. トリガー関数
-- ============================================================

-- プロファイル作成時のトリガー（存在しない場合のみ）
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
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成（存在しない場合のみ）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 更新時刻自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成（存在しない場合のみ）
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. ビュー作成（存在する場合は置き換え）
-- ============================================================

-- API使用状況サマリービュー
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
  u.user_id,
  p.email,
  p.plan,
  COUNT(*) as total_requests,
  COUNT(DISTINCT DATE(u.created_at)) as active_days,
  AVG(u.response_time_ms) as avg_response_time,
  SUM(u.response_size_bytes) as total_bytes_transferred,
  MAX(u.created_at) as last_request_at
FROM api_usage u
JOIN profiles p ON u.user_id = p.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.user_id, p.email, p.plan;

-- アクティブAPIキービュー
CREATE OR REPLACE VIEW active_api_keys AS
SELECT 
  k.id,
  k.user_id,
  k.name,
  k.key_prefix,
  k.is_active,
  k.created_at,
  k.last_used_at,
  k.expires_at,
  p.email,
  p.plan,
  COUNT(u.id) as usage_count_30d
FROM api_keys k
JOIN profiles p ON k.user_id = p.id
LEFT JOIN api_usage u ON k.id = u.api_key_id 
  AND u.created_at > NOW() - INTERVAL '30 days'
WHERE k.is_active = true
  AND (k.expires_at IS NULL OR k.expires_at > NOW())
GROUP BY k.id, k.user_id, k.name, k.key_prefix, k.is_active, 
         k.created_at, k.last_used_at, k.expires_at, p.email, p.plan;

-- 11. 定期クリーンアップ関数
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS VOID AS $$
BEGIN
  DELETE FROM rate_limit_counters
  WHERE window_start < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- 古いAPI使用履歴のアーカイブ（90日以上）
CREATE OR REPLACE FUNCTION archive_old_usage()
RETURNS VOID AS $$
BEGIN
  -- 実際の実装では、別のアーカイブテーブルに移動
  DELETE FROM api_usage
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 実行完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'ユーザー登録・APIキー管理システムのセットアップが完了しました';
  RAISE NOTICE '環境変数 KEY_PEPPER を設定してください（HMAC用）';
END $$;