-- ================================================
-- APIキー管理テーブルのセットアップ
-- ================================================

-- 1. usersテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}',
    CONSTRAINT valid_user_plan CHECK (plan IN ('free', 'standard', 'pro'))
);

-- 2. api_keysテーブルの作成
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 year'),
    last_used_at TIMESTAMP WITH TIME ZONE,
    monthly_limit INTEGER DEFAULT 100,
    requests_this_month INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT valid_api_plan CHECK (plan IN ('free', 'standard', 'pro'))
);

-- 3. api_usageテーブルの作成（使用履歴）
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    api_key TEXT,
    endpoint TEXT,
    method TEXT DEFAULT 'GET',
    status_code INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

-- 4. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key ON api_usage(api_key);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);

-- 5. RLSの有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシーの作成

-- usersテーブルのポリシー
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- api_keysテーブルのポリシー
CREATE POLICY "Users can view own API keys" ON api_keys
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

CREATE POLICY "Service role full access to api_keys" ON api_keys
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- api_usageテーブルのポリシー
CREATE POLICY "Service role can insert usage" ON api_usage
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own usage" ON api_usage
    FOR SELECT USING (
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id::text = auth.uid()::text
        ) OR auth.role() = 'service_role'
    );

-- 7. トリガー関数の作成（使用時刻の更新）
CREATE OR REPLACE FUNCTION update_api_key_last_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE api_keys 
    SET last_used_at = now(),
        requests_this_month = requests_this_month + 1
    WHERE key = NEW.api_key;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS update_api_key_on_usage ON api_usage;
CREATE TRIGGER update_api_key_on_usage
    AFTER INSERT ON api_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_api_key_last_used();

-- 8. デモユーザーとAPIキーの作成
-- デモユーザーの作成
INSERT INTO users (email, name, plan)
VALUES ('demo@example.com', 'Demo User', 'pro')
ON CONFLICT (email) DO UPDATE
SET plan = 'pro',
    updated_at = now();

-- 本番APIキーの登録
INSERT INTO api_keys (
    key, 
    user_id, 
    plan, 
    is_active, 
    expires_at, 
    monthly_limit,
    metadata
)
SELECT 
    'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830',
    u.id,
    'pro',
    true,
    now() + interval '1 year',
    999999,
    jsonb_build_object(
        'description', 'Production API Key for XBRL Financial Data',
        'created_by', 'system_admin',
        'environment', 'production'
    )
FROM users u
WHERE u.email = 'demo@example.com'
ON CONFLICT (key) DO UPDATE
SET is_active = true,
    expires_at = now() + interval '1 year',
    plan = 'pro',
    monthly_limit = 999999;

-- 9. 月次リセット関数（requests_this_monthをリセット）
CREATE OR REPLACE FUNCTION reset_monthly_api_limits()
RETURNS void AS $$
BEGIN
    UPDATE api_keys
    SET requests_this_month = 0
    WHERE EXTRACT(MONTH FROM created_at) != EXTRACT(MONTH FROM now())
       OR EXTRACT(YEAR FROM created_at) != EXTRACT(YEAR FROM now());
END;
$$ LANGUAGE plpgsql;

-- 10. 確認クエリ
SELECT 
    'API Key Setup Complete' as status,
    COUNT(*) as total_keys,
    COUNT(*) FILTER (WHERE is_active = true) as active_keys,
    COUNT(*) FILTER (WHERE key = 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830') as production_key_exists
FROM api_keys;

-- 登録されたAPIキーの詳細を表示
SELECT 
    ak.key as api_key,
    u.email as user_email,
    ak.plan,
    ak.is_active,
    ak.expires_at,
    ak.monthly_limit,
    ak.requests_this_month
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
WHERE ak.key = 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';