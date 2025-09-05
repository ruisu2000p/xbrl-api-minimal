-- ================================
-- マルチテナントAPI拡張機能
-- 既存システムに追加する機能強化
-- ================================

-- 1. 使用量詳細分析テーブル
CREATE TABLE IF NOT EXISTS api_usage_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint_category TEXT NOT NULL, -- 'companies', 'financial', 'markdown', etc
    request_date DATE NOT NULL,
    hourly_distribution JSONB DEFAULT '{}', -- 時間帯別リクエスト分布
    avg_response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    data_transfer_mb DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(api_key_id, endpoint_category, request_date)
);

-- 2. 組織（チーム）管理テーブル
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT CHECK (plan_type IN ('free', 'standard', 'pro', 'enterprise')) DEFAULT 'free',
    max_members INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 組織メンバーテーブル
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'admin', 'developer', 'viewer')) DEFAULT 'developer',
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- 4. APIキーの組織対応（既存テーブル拡張）
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS allowed_origins TEXT[], -- CORS制御
ADD COLUMN IF NOT EXISTS ip_whitelist INET[], -- IP制限
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 5. Webhook設定テーブル
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL, -- ['usage.limit.reached', 'key.expired', etc]
    is_active BOOLEAN DEFAULT true,
    secret_key TEXT NOT NULL, -- HMAC署名用
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. 監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'api_key.created', 'member.invited', etc
    resource_type TEXT,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ================================
-- インデックス追加
-- ================================

CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_date ON api_usage_analytics(request_date);
CREATE INDEX IF NOT EXISTS idx_api_usage_analytics_key_date ON api_usage_analytics(api_key_id, request_date);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ================================
-- RLS ポリシー
-- ================================

-- organizations テーブル
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (
        owner_id = auth.uid() OR
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update their organizations"
    ON organizations FOR UPDATE
    USING (owner_id = auth.uid());

-- organization_members テーブル
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organization members"
    ON organization_members FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- audit_logs テーブル
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization audit logs"
    ON audit_logs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- ================================
-- ヘルパー関数
-- ================================

-- 組織の使用量集計
CREATE OR REPLACE FUNCTION get_organization_usage(p_org_id UUID, p_period TEXT DEFAULT 'month')
RETURNS TABLE (
    total_requests BIGINT,
    total_users INTEGER,
    total_api_keys INTEGER,
    avg_response_time DECIMAL,
    error_rate DECIMAL,
    top_endpoints JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(ul.id)::BIGINT as total_requests,
        COUNT(DISTINCT om.user_id)::INTEGER as total_users,
        COUNT(DISTINCT ak.id)::INTEGER as total_api_keys,
        AVG(ul.response_time_ms)::DECIMAL as avg_response_time,
        (SUM(CASE WHEN ul.status_code >= 400 THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(ul.id), 0) * 100) as error_rate,
        jsonb_agg(DISTINCT ul.endpoint) as top_endpoints
    FROM organizations o
    LEFT JOIN api_keys ak ON ak.organization_id = o.id
    LEFT JOIN api_usage_logs ul ON ul.api_key_id = ak.id
    LEFT JOIN organization_members om ON om.organization_id = o.id
    WHERE o.id = p_org_id
    AND (
        CASE p_period
            WHEN 'day' THEN ul.created_at > NOW() - INTERVAL '1 day'
            WHEN 'week' THEN ul.created_at > NOW() - INTERVAL '1 week'
            WHEN 'month' THEN ul.created_at > NOW() - INTERVAL '1 month'
            ELSE ul.created_at > NOW() - INTERVAL '1 month'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Webhook トリガー関数
CREATE OR REPLACE FUNCTION trigger_webhook(p_event TEXT, p_data JSONB)
RETURNS void AS $$
DECLARE
    webhook RECORD;
BEGIN
    FOR webhook IN 
        SELECT * FROM webhooks 
        WHERE is_active = true 
        AND p_event = ANY(events)
    LOOP
        -- 非同期でWebhookを呼び出す（実際の実装では外部サービスを使用）
        PERFORM pg_notify('webhook_queue', json_build_object(
            'webhook_id', webhook.id,
            'url', webhook.url,
            'event', p_event,
            'data', p_data,
            'secret', webhook.secret_key
        )::text);
        
        UPDATE webhooks 
        SET last_triggered_at = NOW()
        WHERE id = webhook.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 監査ログ記録関数
CREATE OR REPLACE FUNCTION log_audit_event(
    p_org_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        p_org_id,
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details
    );
END;
$$ LANGUAGE plpgsql;

-- ================================
-- トリガー
-- ================================

-- APIキー作成時の監査ログ
CREATE OR REPLACE FUNCTION audit_api_key_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            NEW.organization_id,
            NEW.created_by,
            'api_key.created',
            'api_key',
            NEW.id,
            jsonb_build_object('name', NEW.name, 'plan_type', NEW.plan_type)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit_event(
            OLD.organization_id,
            auth.uid(),
            'api_key.deleted',
            'api_key',
            OLD.id,
            jsonb_build_object('name', OLD.name)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_api_keys
    AFTER INSERT OR DELETE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION audit_api_key_changes();

-- 使用量制限到達時のWebhook
CREATE OR REPLACE FUNCTION check_usage_limits()
RETURNS TRIGGER AS $$
DECLARE
    usage_percent DECIMAL;
    plan_limit INTEGER;
BEGIN
    -- プランの制限を取得
    SELECT sp.request_limit_monthly INTO plan_limit
    FROM api_keys ak
    JOIN subscription_plans sp ON sp.plan_type = ak.plan_type
    WHERE ak.id = NEW.api_key_id;
    
    IF plan_limit IS NOT NULL THEN
        -- 使用率を計算
        SELECT COUNT(*)::DECIMAL / plan_limit * 100 INTO usage_percent
        FROM api_usage_logs
        WHERE api_key_id = NEW.api_key_id
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());
        
        -- 80%、90%、100%でWebhookトリガー
        IF usage_percent >= 100 AND usage_percent < 101 THEN
            PERFORM trigger_webhook('usage.limit.reached', jsonb_build_object(
                'api_key_id', NEW.api_key_id,
                'usage_percent', usage_percent,
                'limit', plan_limit
            ));
        ELSIF usage_percent >= 90 AND usage_percent < 91 THEN
            PERFORM trigger_webhook('usage.limit.warning', jsonb_build_object(
                'api_key_id', NEW.api_key_id,
                'usage_percent', usage_percent,
                'limit', plan_limit
            ));
        ELSIF usage_percent >= 80 AND usage_percent < 81 THEN
            PERFORM trigger_webhook('usage.limit.alert', jsonb_build_object(
                'api_key_id', NEW.api_key_id,
                'usage_percent', usage_percent,
                'limit', plan_limit
            ));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_usage_limit_check
    AFTER INSERT ON api_usage_logs
    FOR EACH ROW EXECUTE FUNCTION check_usage_limits();

-- ================================
-- ビュー
-- ================================

-- 組織ダッシュボードビュー
CREATE OR REPLACE VIEW organization_dashboard AS
SELECT 
    o.id,
    o.name,
    o.slug,
    o.plan_type,
    COUNT(DISTINCT om.user_id) as member_count,
    COUNT(DISTINCT ak.id) as api_key_count,
    COUNT(DISTINCT ul.id) as total_requests_30d,
    MAX(ul.created_at) as last_api_activity,
    o.created_at
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
LEFT JOIN api_keys ak ON ak.organization_id = o.id
LEFT JOIN api_usage_logs ul ON ul.api_key_id = ak.id 
    AND ul.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name, o.slug, o.plan_type, o.created_at;

-- APIキー詳細ビュー
CREATE OR REPLACE VIEW api_key_details AS
SELECT 
    ak.id,
    ak.name,
    ak.description,
    ak.key_prefix,
    ak.plan_type,
    ak.is_active,
    ak.organization_id,
    o.name as organization_name,
    u.email as created_by_email,
    COUNT(DISTINCT ul.id) as total_requests,
    COUNT(DISTINCT DATE(ul.created_at)) as active_days,
    MAX(ul.created_at) as last_used_at,
    ak.created_at,
    ak.expires_at
FROM api_keys ak
LEFT JOIN organizations o ON o.id = ak.organization_id
LEFT JOIN auth.users u ON u.id = ak.created_by
LEFT JOIN api_usage_logs ul ON ul.api_key_id = ak.id
GROUP BY ak.id, ak.name, ak.description, ak.key_prefix, ak.plan_type, 
         ak.is_active, ak.organization_id, o.name, u.email, 
         ak.created_at, ak.expires_at;

COMMENT ON TABLE api_usage_analytics IS '使用量詳細分析テーブル';
COMMENT ON TABLE organizations IS '組織（チーム）管理テーブル';
COMMENT ON TABLE organization_members IS '組織メンバー管理テーブル';
COMMENT ON TABLE webhooks IS 'Webhook設定テーブル';
COMMENT ON TABLE audit_logs IS '監査ログテーブル';