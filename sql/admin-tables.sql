-- 管理者ダッシュボード用のテーブル作成SQL
-- Supabase Dashboard > SQL Editor で実行

-- ========================================
-- 1. ユーザーテーブルの拡張
-- ========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  total_api_calls INTEGER DEFAULT 0,
  monthly_api_calls INTEGER DEFAULT 0,
  subscription_start_date DATE,
  subscription_end_date DATE,
  stripe_customer_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  suspension_reason TEXT,
  notes TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_users_join_date ON users(join_date);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);

-- ========================================
-- 2. API使用ログテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  request_body JSONB,
  response_size_bytes INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);

-- ========================================
-- 3. 収益記録テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS revenue_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- 金額（円）
  currency VARCHAR(3) DEFAULT 'JPY',
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('free', 'standard', 'pro')),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_revenue_records_user_id ON revenue_records(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_created_at ON revenue_records(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_records_payment_status ON revenue_records(payment_status);

-- ========================================
-- 4. システムメトリクステーブル
-- ========================================
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  metric_value NUMERIC(10,2) NOT NULL,
  metric_unit VARCHAR(20),
  server_name VARCHAR(100),
  metadata JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- ========================================
-- 5. 管理者アクティビティログ
-- ========================================
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);

-- ========================================
-- 6. 通知設定テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  webhook_url TEXT,
  threshold_value NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- ========================================
-- 7. ビュー作成：ユーザー統計
-- ========================================
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.subscription_plan,
  u.join_date,
  u.last_login,
  u.is_active,
  COALESCE(u.monthly_api_calls, 0) as monthly_api_calls,
  COALESCE(u.total_api_calls, 0) as total_api_calls,
  DATE_PART('day', NOW() - u.join_date) as days_since_joined,
  CASE 
    WHEN u.subscription_plan = 'pro' THEN 2980
    WHEN u.subscription_plan = 'standard' THEN 1080
    ELSE 0
  END as monthly_revenue,
  (SELECT COUNT(*) FROM api_usage_logs WHERE user_id = u.id AND created_at > NOW() - INTERVAL '24 hours') as calls_last_24h,
  (SELECT COUNT(*) FROM api_usage_logs WHERE user_id = u.id AND created_at > NOW() - INTERVAL '7 days') as calls_last_7d
FROM users u;

-- ========================================
-- 8. ビュー作成：収益サマリー
-- ========================================
CREATE OR REPLACE VIEW revenue_summary AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(amount) as total_revenue,
  AVG(amount) as average_revenue,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN plan_type = 'pro' THEN amount ELSE 0 END) as pro_revenue,
  SUM(CASE WHEN plan_type = 'standard' THEN amount ELSE 0 END) as standard_revenue,
  SUM(CASE WHEN plan_type = 'free' THEN amount ELSE 0 END) as free_revenue
FROM revenue_records
WHERE payment_status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ========================================
-- 9. ビュー作成：APIエンドポイント統計
-- ========================================
CREATE OR REPLACE VIEW api_endpoint_statistics AS
SELECT 
  endpoint,
  method,
  COUNT(*) as total_calls,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time,
  MIN(response_time_ms) as min_response_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
  ROUND(COUNT(CASE WHEN status_code >= 400 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as error_rate
FROM api_usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint, method
ORDER BY total_calls DESC;

-- ========================================
-- 10. トリガー関数：月次API使用量リセット
-- ========================================
CREATE OR REPLACE FUNCTION reset_monthly_api_calls()
RETURNS void AS $$
BEGIN
  UPDATE users SET monthly_api_calls = 0;
  
  -- リセットログを記録
  INSERT INTO admin_activity_logs (action_type, description, metadata)
  VALUES ('monthly_reset', 'Monthly API calls reset', jsonb_build_object('reset_time', NOW()));
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 11. RLSポリシー設定
-- ========================================

-- API使用ログ：認証されたユーザーは自分のログのみ閲覧可能
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all logs" ON api_usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 収益記録：管理者のみアクセス可能
ALTER TABLE revenue_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view revenue" ON revenue_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- システムメトリクス：管理者のみアクセス可能
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view metrics" ON system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ========================================
-- 12. 初期データ投入（テスト用）
-- ========================================
-- 管理者ユーザーの作成例
-- INSERT INTO users (email, name, role, subscription_plan, is_active)
-- VALUES 
--   ('admin@xbrl-api.com', '管理者', 'admin', 'pro', true);

-- ========================================
-- 実行完了メッセージ
-- ========================================
-- このSQLを実行後、以下を確認してください：
-- 1. 全テーブルが正常に作成されたか
-- 2. インデックスが作成されたか
-- 3. ビューが作成されたか
-- 4. RLSポリシーが適用されたか