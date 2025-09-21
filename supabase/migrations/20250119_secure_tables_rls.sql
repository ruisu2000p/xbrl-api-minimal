-- Secure all tables with proper RLS policies
-- This migration ensures all tables are protected with authentication

-- ============================================
-- 1. Enable RLS on all tables
-- ============================================

-- Enable RLS on core tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on business tables if they exist
DO $$
BEGIN
    -- Check if tables exist before enabling RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        EXECUTE 'ALTER TABLE companies ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'markdown_files_metadata') THEN
        EXECUTE 'ALTER TABLE markdown_files_metadata ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_master') THEN
        EXECUTE 'ALTER TABLE company_master ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_directory_mapping') THEN
        EXECUTE 'ALTER TABLE company_directory_mapping ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- ============================================
-- 2. Drop existing public policies
-- ============================================

-- Drop any existing "allow all" policies
DROP POLICY IF EXISTS "Public read access" ON api_keys;
DROP POLICY IF EXISTS "Public read access" ON api_key_permissions;
DROP POLICY IF EXISTS "Public read access" ON api_key_rate_limits;
DROP POLICY IF EXISTS "Public read access" ON api_key_usage_logs;
DROP POLICY IF EXISTS "Public read access" ON security_events;
DROP POLICY IF EXISTS "Public read access" ON profiles;
DROP POLICY IF EXISTS "Public read access" ON subscription_plans;
DROP POLICY IF EXISTS "Public read access" ON user_subscriptions;

-- ============================================
-- 3. Create authentication-required policies
-- ============================================

-- API Keys policies (authenticated users can manage their own keys)
CREATE POLICY "Users can view own API keys"
    ON api_keys FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own API keys"
    ON api_keys FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own API keys"
    ON api_keys FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own API keys"
    ON api_keys FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- API Key permissions (read-only for authenticated users)
CREATE POLICY "Authenticated users can view API key permissions"
    ON api_key_permissions FOR SELECT
    TO authenticated
    USING (
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id = auth.uid()
        )
    );

-- Rate limits (read-only for authenticated users)
CREATE POLICY "Authenticated users can view rate limits"
    ON api_key_rate_limits FOR SELECT
    TO authenticated
    USING (
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id = auth.uid()
        )
    );

-- Usage logs (users can view their own)
CREATE POLICY "Users can view own usage logs"
    ON api_key_usage_logs FOR SELECT
    TO authenticated
    USING (
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id = auth.uid()
        )
    );

-- Security events (users can view their own)
CREATE POLICY "Users can view own security events"
    ON security_events FOR SELECT
    TO authenticated
    USING (
        api_key_id IN (
            SELECT id FROM api_keys WHERE user_id = auth.uid()
        )
    );

-- Profiles (users can manage their own profile)
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Subscription plans (authenticated users can view)
CREATE POLICY "Authenticated users can view subscription plans"
    ON subscription_plans FOR SELECT
    TO authenticated
    USING (true);

-- User subscriptions (users can view their own)
CREATE POLICY "Users can view own subscriptions"
    ON user_subscriptions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- 4. Special policies for API key validation
-- ============================================

-- Create a special function for API key validation that bypasses RLS
CREATE OR REPLACE FUNCTION public.validate_api_key_access(key_hash TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    tier TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ak.id,
        ak.user_id,
        ak.name,
        ak.status,
        ak.expires_at,
        COALESCE(sp.name, 'free') as tier
    FROM api_keys ak
    LEFT JOIN user_subscriptions us ON us.user_id = ak.user_id AND us.status = 'active'
    LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE ak.key_hash = validate_api_key_access.key_hash
        AND ak.status = 'active'
        AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to anon role for API key validation
GRANT EXECUTE ON FUNCTION public.validate_api_key_access TO anon;

-- ============================================
-- 5. Business data access policies
-- ============================================

-- Function to check if user has valid API key
CREATE OR REPLACE FUNCTION public.has_valid_api_key(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM api_keys
        WHERE api_keys.user_id = has_valid_api_key.user_id
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Business data policies (if tables exist)
DO $$
BEGIN
    -- markdown_files_metadata policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'markdown_files_metadata') THEN
        EXECUTE 'CREATE POLICY "Authenticated users with API key can view markdown files"
            ON markdown_files_metadata FOR SELECT
            TO authenticated
            USING (has_valid_api_key(auth.uid()))';
    END IF;

    -- company_master policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_master') THEN
        EXECUTE 'CREATE POLICY "Authenticated users with API key can view company master"
            ON company_master FOR SELECT
            TO authenticated
            USING (has_valid_api_key(auth.uid()))';
    END IF;

    -- company_directory_mapping policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_directory_mapping') THEN
        EXECUTE 'CREATE POLICY "Authenticated users with API key can view directory mapping"
            ON company_directory_mapping FOR SELECT
            TO authenticated
            USING (has_valid_api_key(auth.uid()))';
    END IF;
END $$;

-- ============================================
-- 6. Grant necessary permissions
-- ============================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select on specific tables that authenticated users need
GRANT SELECT ON subscription_plans TO authenticated;

-- Revoke unnecessary permissions from anon role
REVOKE ALL ON api_keys FROM anon;
REVOKE ALL ON api_key_permissions FROM anon;
REVOKE ALL ON api_key_rate_limits FROM anon;
REVOKE ALL ON api_key_usage_logs FROM anon;
REVOKE ALL ON security_events FROM anon;
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON subscription_plans FROM anon;
REVOKE ALL ON user_subscriptions FROM anon;

-- Keep only necessary function access for anon
GRANT EXECUTE ON FUNCTION public.validate_api_key_access TO anon;

-- ============================================
-- 7. Add comments for documentation
-- ============================================

COMMENT ON POLICY "Users can view own API keys" ON api_keys IS
'Authenticated users can only view their own API keys';

COMMENT ON POLICY "Authenticated users can view subscription plans" ON subscription_plans IS
'All authenticated users can view available subscription plans';

COMMENT ON FUNCTION public.validate_api_key_access IS
'Validates API key and returns key information - bypasses RLS for API authentication';

COMMENT ON FUNCTION public.has_valid_api_key IS
'Checks if a user has at least one valid active API key';