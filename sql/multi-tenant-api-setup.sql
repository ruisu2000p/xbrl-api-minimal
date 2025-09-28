-- ================================
-- マルチテナントAPI用のデータベース構造
-- ================================

-- 1. APIユーザーテーブル
CREATE TABLE IF NOT EXISTS api_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    organization_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. APIキー管理テーブル
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    key_hash TEXT UNIQUE NOT NULL, -- ハッシュ化されたAPIキー
    key_prefix TEXT NOT NULL, -- キーの最初の8文字（識別用）
    name TEXT, -- キーの名前（例：Production API Key）
    plan_type TEXT CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 料金プラン設定
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_type TEXT UNIQUE NOT NULL,
    price_monthly INTEGER NOT NULL, -- 円単位
    request_limit_monthly INTEGER, -- NULL = 無制限
    rate_limit_per_minute INTEGER NOT NULL,
    data_access_years INTEGER, -- NULL = 全期間
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 使用量追跡テーブル
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_body_size INTEGER,
    response_body_size INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 月次使用量サマリー（集計用）
CREATE TABLE IF NOT EXISTS usage_summary_monthly (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_response_time_ms BIGINT DEFAULT 0,
    unique_endpoints TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(api_key_id, year, month)
);

-- 6. 課金履歴テーブル
CREATE TABLE IF NOT EXISTS billing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'JPY',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ================================
-- インデックス作成
-- ================================

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX idx_usage_summary_monthly_api_key_id ON usage_summary_monthly(api_key_id);

-- ================================
-- Row Level Security (RLS) ポリシー
-- ================================

-- api_usersテーブルのRLS
ALTER TABLE api_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON api_users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON api_users FOR UPDATE
    USING (auth.uid() = id);

-- api_keysテーブルのRLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API keys"
    ON api_keys FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API keys"
    ON api_keys FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys"
    ON api_keys FOR UPDATE
    USING (user_id = auth.uid());

-- api_usage_logsテーブルのRLS
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
    ON api_usage_logs FOR SELECT
    USING (
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id = auth.uid()
        )
    );

-- ================================
-- 初期データ投入
-- ================================

-- 料金プランの設定
INSERT INTO subscription_plans (plan_type, price_monthly, request_limit_monthly, rate_limit_per_minute, data_access_years, features)
VALUES 
    ('free', 0, 1000, 10, 1, '{"support": "community", "api_keys": 1}'),
    ('basic', 1080, 10000, 60, 3, '{"support": "email", "api_keys": 3}'),
    ('pro', 2980, 100000, 300, NULL, '{"support": "priority", "api_keys": 10, "custom_domain": true}'),
    ('enterprise', 9800, NULL, 1000, NULL, '{"support": "dedicated", "api_keys": "unlimited", "custom_domain": true, "sla": true}')
ON CONFLICT (plan_type) DO NOTHING;

-- ================================
-- ヘルパー関数
-- ================================

-- APIキー生成関数
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
    key TEXT;
BEGIN
    -- xbrl_で始まる32文字のランダムキーを生成
    key := 'xbrl_' || encode(gen_random_bytes(24), 'base64');
    -- URLセーフな文字に変換
    key := replace(replace(replace(key, '+', ''), '/', ''), '=', '');
    RETURN key;
END;
$$ LANGUAGE plpgsql;

-- 使用量チェック関数
CREATE OR REPLACE FUNCTION check_api_usage_limit(p_api_key_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_type TEXT;
    v_limit INTEGER;
    v_current_usage INTEGER;
BEGIN
    -- APIキーのプランを取得
    SELECT plan_type INTO v_plan_type
    FROM api_keys
    WHERE id = p_api_key_id AND is_active = true;
    
    IF v_plan_type IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- プランの制限を取得
    SELECT request_limit_monthly INTO v_limit
    FROM subscription_plans
    WHERE plan_type = v_plan_type;
    
    -- 無制限の場合
    IF v_limit IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- 現在の月の使用量を取得
    SELECT COUNT(*) INTO v_current_usage
    FROM api_usage_logs
    WHERE api_key_id = p_api_key_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
    
    RETURN v_current_usage < v_limit;
END;
$$ LANGUAGE plpgsql;

-- レート制限チェック関数
CREATE OR REPLACE FUNCTION check_rate_limit(p_api_key_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_type TEXT;
    v_limit INTEGER;
    v_current_requests INTEGER;
BEGIN
    -- APIキーのプランを取得
    SELECT plan_type INTO v_plan_type
    FROM api_keys
    WHERE id = p_api_key_id AND is_active = true;
    
    IF v_plan_type IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- プランのレート制限を取得
    SELECT rate_limit_per_minute INTO v_limit
    FROM subscription_plans
    WHERE plan_type = v_plan_type;
    
    -- 過去1分間のリクエスト数を取得
    SELECT COUNT(*) INTO v_current_requests
    FROM api_usage_logs
    WHERE api_key_id = p_api_key_id
    AND created_at > NOW() - INTERVAL '1 minute';
    
    RETURN v_current_requests < v_limit;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- ビューの作成
-- ================================

-- ユーザーダッシュボード用ビュー
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    u.id,
    u.email,
    u.organization_name,
    COUNT(DISTINCT k.id) as api_keys_count,
    COUNT(DISTINCT l.id) as total_requests,
    MAX(l.created_at) as last_api_call,
    COALESCE(SUM(CASE WHEN l.created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0) as requests_last_30_days
FROM api_users u
LEFT JOIN api_keys k ON u.id = k.user_id
LEFT JOIN api_usage_logs l ON k.id = l.api_key_id
GROUP BY u.id, u.email, u.organization_name;

-- APIキー統計ビュー
CREATE OR REPLACE VIEW api_key_stats AS
SELECT 
    k.id,
    k.name,
    k.plan_type,
    k.key_prefix,
    COUNT(l.id) as total_requests,
    AVG(l.response_time_ms) as avg_response_time,
    MAX(l.created_at) as last_used,
    COALESCE(SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(l.id), 0) * 100, 0) as error_rate
FROM api_keys k
LEFT JOIN api_usage_logs l ON k.id = l.api_key_id
GROUP BY k.id, k.name, k.plan_type, k.key_prefix;

-- ================================
-- トリガー
-- ================================

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_users_updated_at BEFORE UPDATE ON api_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- APIキー使用時のlast_used_at更新トリガー
CREATE OR REPLACE FUNCTION update_api_key_last_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE api_keys 
    SET last_used_at = NEW.created_at
    WHERE id = NEW.api_key_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_used_on_api_call
    AFTER INSERT ON api_usage_logs
    FOR EACH ROW EXECUTE FUNCTION update_api_key_last_used();

-- ================================
-- セキュリティ設定
-- ================================

-- Service Roleのみがapi_usage_logsに書き込み可能
GRANT INSERT ON api_usage_logs TO service_role;
GRANT SELECT ON api_usage_logs TO authenticated;

-- 認証済みユーザーは自分のデータのみ参照可能
GRANT SELECT, INSERT, UPDATE ON api_users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON api_keys TO authenticated;
GRANT SELECT ON subscription_plans TO authenticated, anon;

COMMENT ON TABLE api_users IS 'APIユーザー管理テーブル';
COMMENT ON TABLE api_keys IS 'APIキー管理テーブル';
COMMENT ON TABLE subscription_plans IS '料金プラン設定テーブル';
COMMENT ON TABLE api_usage_logs IS 'API使用ログテーブル';
COMMENT ON TABLE usage_summary_monthly IS '月次使用量サマリーテーブル';
COMMENT ON TABLE billing_history IS '課金履歴テーブル';