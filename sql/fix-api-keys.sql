-- ============================================
-- API Keys Table Fix
-- ============================================
-- このスクリプトはapi_keysテーブルの問題を修正します
-- ============================================

-- 1. 既存のapi_keysテーブルを削除（存在する場合）
DROP TABLE IF EXISTS api_key_usage_logs CASCADE;
DROP TABLE IF EXISTS api_key_rate_limits CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;

-- 2. api_keysテーブルを新規作成
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL DEFAULT 'Default API Key',
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
    tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. インデックス作成
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);

-- 4. api_key_rate_limitsテーブル作成
CREATE TABLE api_key_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    requests_per_hour INTEGER DEFAULT 100,
    requests_per_day INTEGER DEFAULT 1000,
    requests_per_month INTEGER DEFAULT 10000,
    current_hour_count INTEGER DEFAULT 0,
    current_day_count INTEGER DEFAULT 0,
    current_month_count INTEGER DEFAULT 0,
    last_hour_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_day_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_month_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(api_key_id)
);

-- 5. api_key_usage_logsテーブル作成
CREATE TABLE api_key_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    request_body JSONB,
    response_body JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. インデックス作成
CREATE INDEX idx_usage_logs_api_key ON api_key_usage_logs(api_key_id);
CREATE INDEX idx_usage_logs_created ON api_key_usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_endpoint ON api_key_usage_logs(endpoint);

-- 7. RLSポリシー有効化
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLSポリシー作成
-- API Keys: ユーザーは自分のキーのみ表示可能
CREATE POLICY "Users can view own API keys" ON api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys" ON api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON api_keys
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON api_keys
    FOR DELETE
    USING (auth.uid() = user_id);

-- Rate Limits: APIキー所有者のみアクセス可能
CREATE POLICY "Users can view own rate limits" ON api_key_rate_limits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM api_keys
            WHERE api_keys.id = api_key_rate_limits.api_key_id
            AND api_keys.user_id = auth.uid()
        )
    );

-- Usage Logs: APIキー所有者のみアクセス可能
CREATE POLICY "Users can view own usage logs" ON api_key_usage_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM api_keys
            WHERE api_keys.id = api_key_usage_logs.api_key_id
            AND api_keys.user_id = auth.uid()
        )
    );

-- 9. 更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. トリガー適用
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON api_key_rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. 確認クエリ
SELECT 'API Keys tables created successfully!' as message;