-- Production Database Setup for XBRL API
-- Run this in Supabase SQL Editor

-- 1. Enable Row Level Security on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 2. Create read-only policy for companies
CREATE POLICY "Enable read access for all users" ON companies
    FOR SELECT
    USING (true);

-- 3. Create API keys table if not exists
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
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

-- 4. Create rate limits table
CREATE TABLE IF NOT EXISTS api_key_rate_limits (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create usage logs table
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    user_agent TEXT,
    referer TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_rate_limits_api_key_id ON api_key_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

-- 7. Create helper functions
CREATE OR REPLACE FUNCTION increment_api_key_stats(
    key_id UUID,
    success BOOLEAN
) RETURNS VOID AS $$
BEGIN
    IF success THEN
        UPDATE api_keys 
        SET 
            total_requests = total_requests + 1,
            successful_requests = successful_requests + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = key_id;
    ELSE
        UPDATE api_keys 
        SET 
            total_requests = total_requests + 1,
            failed_requests = failed_requests + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = key_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to check and reset rate limits
CREATE OR REPLACE FUNCTION check_and_update_rate_limit(
    p_api_key_id UUID
) RETURNS TABLE(
    allowed BOOLEAN,
    remaining_hour INTEGER,
    remaining_day INTEGER
) AS $$
DECLARE
    v_rate_limit RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get current rate limit record
    SELECT * INTO v_rate_limit
    FROM api_key_rate_limits
    WHERE api_key_id = p_api_key_id;
    
    IF NOT FOUND THEN
        -- Create default rate limit if not exists
        INSERT INTO api_key_rate_limits (api_key_id)
        VALUES (p_api_key_id)
        RETURNING * INTO v_rate_limit;
    END IF;
    
    -- Reset hourly counter if needed
    IF v_now - v_rate_limit.last_hour_reset >= INTERVAL '1 hour' THEN
        UPDATE api_key_rate_limits
        SET 
            current_hour_count = 0,
            last_hour_reset = v_now
        WHERE api_key_id = p_api_key_id;
        v_rate_limit.current_hour_count := 0;
    END IF;
    
    -- Reset daily counter if needed
    IF v_now - v_rate_limit.last_day_reset >= INTERVAL '1 day' THEN
        UPDATE api_key_rate_limits
        SET 
            current_day_count = 0,
            last_day_reset = v_now
        WHERE api_key_id = p_api_key_id;
        v_rate_limit.current_day_count := 0;
    END IF;
    
    -- Check if request is allowed
    IF v_rate_limit.current_hour_count < v_rate_limit.requests_per_hour 
       AND v_rate_limit.current_day_count < v_rate_limit.requests_per_day THEN
        
        -- Update counters
        UPDATE api_key_rate_limits
        SET 
            current_hour_count = current_hour_count + 1,
            current_day_count = current_day_count + 1,
            updated_at = v_now
        WHERE api_key_id = p_api_key_id;
        
        RETURN QUERY SELECT 
            TRUE,
            v_rate_limit.requests_per_hour - v_rate_limit.current_hour_count - 1,
            v_rate_limit.requests_per_day - v_rate_limit.current_day_count - 1;
    ELSE
        RETURN QUERY SELECT 
            FALSE,
            GREATEST(0, v_rate_limit.requests_per_hour - v_rate_limit.current_hour_count),
            GREATEST(0, v_rate_limit.requests_per_day - v_rate_limit.current_day_count);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Create view for API key statistics
CREATE OR REPLACE VIEW api_key_statistics AS
SELECT 
    ak.id,
    ak.name,
    ak.tier,
    ak.status,
    ak.created_at,
    ak.last_used_at,
    ak.total_requests,
    ak.successful_requests,
    ak.failed_requests,
    CASE 
        WHEN ak.total_requests > 0 
        THEN ROUND(100.0 * ak.successful_requests / ak.total_requests, 2)
        ELSE 0 
    END as success_rate,
    arl.requests_per_hour,
    arl.requests_per_day,
    arl.current_hour_count,
    arl.current_day_count,
    COUNT(DISTINCT aul.ip_address) as unique_ips,
    COUNT(DISTINCT DATE(aul.created_at)) as active_days
FROM api_keys ak
LEFT JOIN api_key_rate_limits arl ON ak.id = arl.api_key_id
LEFT JOIN api_key_usage_logs aul ON ak.id = aul.api_key_id
GROUP BY 
    ak.id, ak.name, ak.tier, ak.status, ak.created_at, 
    ak.last_used_at, ak.total_requests, ak.successful_requests, 
    ak.failed_requests, arl.requests_per_hour, arl.requests_per_day,
    arl.current_hour_count, arl.current_day_count;

-- 10. Insert sample production API key (for testing)
-- Note: In production, use the API or admin panel to create keys
DO $$
DECLARE
    v_key_hash VARCHAR(64);
BEGIN
    -- Only insert if no production keys exist
    IF NOT EXISTS (SELECT 1 FROM api_keys WHERE tier != 'free') THEN
        -- This is a hash of 'xbrl_prod_sample_key_2025' - DO NOT USE IN PRODUCTION
        v_key_hash := encode(sha256('xbrl_prod_sample_key_2025'::bytea), 'hex');
        
        INSERT INTO api_keys (
            key_hash, 
            name, 
            description,
            status, 
            tier,
            expires_at
        ) VALUES (
            v_key_hash,
            'Sample Production Key',
            'Sample key for production testing - REPLACE WITH REAL KEY',
            'active',
            'pro',
            NOW() + INTERVAL '1 year'
        );
        
        -- Set rate limits for pro tier
        INSERT INTO api_key_rate_limits (
            api_key_id,
            requests_per_hour,
            requests_per_day,
            requests_per_month
        ) 
        SELECT 
            id,
            1000,  -- 1000 requests per hour
            10000, -- 10,000 requests per day
            100000 -- 100,000 requests per month
        FROM api_keys 
        WHERE key_hash = v_key_hash;
        
        RAISE NOTICE 'Sample production API key created. Hash: %', v_key_hash;
    END IF;
END $$;

-- 11. Grant necessary permissions
GRANT SELECT ON companies TO anon, authenticated;
GRANT SELECT ON api_key_statistics TO authenticated;

-- 12. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_key_rate_limits_updated_at BEFORE UPDATE ON api_key_rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Completion message
DO $$
BEGIN
    RAISE NOTICE 'Production database setup completed successfully!';
    RAISE NOTICE 'Total companies: %', (SELECT COUNT(*) FROM companies);
    RAISE NOTICE 'API keys configured: %', (SELECT COUNT(*) FROM api_keys);
END $$;