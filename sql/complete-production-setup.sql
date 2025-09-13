-- =====================================================
-- Complete Production Setup for XBRL API
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: ENABLE SECURITY FEATURES
-- =====================================================

-- Enable Row Level Security on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for companies
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
CREATE POLICY "Enable read access for all users" ON companies
    FOR SELECT
    USING (true);

-- =====================================================
-- PART 2: UPDATE API_KEYS TABLE
-- =====================================================

DO $$
BEGIN
    -- Add tier column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'tier'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN tier VARCHAR(50) DEFAULT 'free' 
            CHECK (tier IN ('free', 'basic', 'pro', 'enterprise'));
    END IF;
    
    -- Add description column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'description'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN description TEXT;
    END IF;
    
    -- Add metadata column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add updated_at column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- PART 3: CREATE RATE LIMITS TABLE
-- =====================================================

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

-- =====================================================
-- PART 4: UPDATE USAGE LOGS TABLE
-- =====================================================

DO $$
BEGIN
    -- Add missing columns to api_key_usage_logs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_key_usage_logs' AND column_name = 'request_size_bytes'
    ) THEN
        ALTER TABLE api_key_usage_logs ADD COLUMN request_size_bytes INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_key_usage_logs' AND column_name = 'response_size_bytes'
    ) THEN
        ALTER TABLE api_key_usage_logs ADD COLUMN response_size_bytes INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_key_usage_logs' AND column_name = 'country_code'
    ) THEN
        ALTER TABLE api_key_usage_logs ADD COLUMN country_code VARCHAR(2);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_key_usage_logs' AND column_name = 'referer'
    ) THEN
        ALTER TABLE api_key_usage_logs ADD COLUMN referer TEXT;
    END IF;
END $$;

-- =====================================================
-- PART 5: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_rate_limits_api_key_id ON api_key_rate_limits(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

-- =====================================================
-- PART 6: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to increment API key statistics
CREATE OR REPLACE FUNCTION increment_api_key_stats(
    key_id UUID,
    success BOOLEAN
) RETURNS VOID AS $$
BEGIN
    IF success THEN
        UPDATE api_keys 
        SET 
            total_requests = COALESCE(total_requests, 0) + 1,
            successful_requests = COALESCE(successful_requests, 0) + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = key_id;
    ELSE
        UPDATE api_keys 
        SET 
            total_requests = COALESCE(total_requests, 0) + 1,
            failed_requests = COALESCE(failed_requests, 0) + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE id = key_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update rate limits
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
            last_hour_reset = v_now,
            updated_at = v_now
        WHERE api_key_id = p_api_key_id;
        v_rate_limit.current_hour_count := 0;
    END IF;
    
    -- Reset daily counter if needed
    IF v_now - v_rate_limit.last_day_reset >= INTERVAL '1 day' THEN
        UPDATE api_key_rate_limits
        SET 
            current_day_count = 0,
            last_day_reset = v_now,
            updated_at = v_now
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

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key(
    p_name VARCHAR(255),
    p_user_id UUID DEFAULT NULL,
    p_tier VARCHAR(50) DEFAULT 'free',
    p_expires_in_days INTEGER DEFAULT 365
) RETURNS TABLE(
    api_key_id UUID,
    api_key_hash VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_key_id UUID;
    v_key_hash VARCHAR(64);
    v_expires TIMESTAMP WITH TIME ZONE;
BEGIN
    v_key_id := gen_random_uuid();
    v_key_hash := encode(sha256(v_key_id::text::bytea), 'hex');
    v_expires := NOW() + (p_expires_in_days || ' days')::INTERVAL;
    
    -- Insert the API key
    INSERT INTO api_keys (
        id,
        key_hash,
        user_id,
        name,
        tier,
        status,
        expires_at,
        created_at,
        updated_at
    ) VALUES (
        v_key_id,
        v_key_hash,
        p_user_id,
        p_name,
        p_tier,
        'active',
        v_expires,
        NOW(),
        NOW()
    );
    
    -- Create rate limit entry based on tier
    INSERT INTO api_key_rate_limits (
        api_key_id,
        requests_per_hour,
        requests_per_day,
        requests_per_month
    ) VALUES (
        v_key_id,
        CASE p_tier
            WHEN 'enterprise' THEN 10000
            WHEN 'pro' THEN 1000
            WHEN 'basic' THEN 500
            ELSE 100
        END,
        CASE p_tier
            WHEN 'enterprise' THEN 100000
            WHEN 'pro' THEN 10000
            WHEN 'basic' THEN 5000
            ELSE 1000
        END,
        CASE p_tier
            WHEN 'enterprise' THEN 1000000
            WHEN 'pro' THEN 100000
            WHEN 'basic' THEN 50000
            ELSE 10000
        END
    );
    
    RETURN QUERY SELECT v_key_id, v_key_hash, v_expires;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 7: CREATE VIEWS
-- =====================================================

CREATE OR REPLACE VIEW api_key_statistics AS
SELECT 
    ak.id,
    ak.name,
    COALESCE(ak.tier, 'free') as tier,
    ak.status,
    ak.created_at,
    ak.last_used_at,
    COALESCE(ak.total_requests, 0) as total_requests,
    COALESCE(ak.successful_requests, 0) as successful_requests,
    COALESCE(ak.failed_requests, 0) as failed_requests,
    CASE 
        WHEN COALESCE(ak.total_requests, 0) > 0 
        THEN ROUND(100.0 * COALESCE(ak.successful_requests, 0) / ak.total_requests, 2)
        ELSE 0 
    END as success_rate,
    COALESCE(arl.requests_per_hour, 100) as requests_per_hour,
    COALESCE(arl.requests_per_day, 1000) as requests_per_day,
    COALESCE(arl.current_hour_count, 0) as current_hour_count,
    COALESCE(arl.current_day_count, 0) as current_day_count
FROM api_keys ak
LEFT JOIN api_key_rate_limits arl ON ak.id = arl.api_key_id;

-- =====================================================
-- PART 8: CREATE TRIGGERS
-- =====================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_api_keys_updated_at'
    ) THEN
        CREATE TRIGGER update_api_keys_updated_at 
        BEFORE UPDATE ON api_keys
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_api_key_rate_limits_updated_at'
    ) THEN
        CREATE TRIGGER update_api_key_rate_limits_updated_at 
        BEFORE UPDATE ON api_key_rate_limits
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- PART 9: GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON companies TO anon, authenticated;
GRANT SELECT ON api_key_statistics TO authenticated;

-- =====================================================
-- PART 10: CREATE SAMPLE API KEY FOR TESTING
-- =====================================================

DO $$
DECLARE
    v_result RECORD;
BEGIN
    -- Check if any API keys exist
    IF NOT EXISTS (SELECT 1 FROM api_keys) THEN
        -- Generate a test key
        SELECT * INTO v_result FROM generate_api_key(
            'Test Development Key',
            NULL,
            'pro',
            365
        );
        
        RAISE NOTICE '';
        RAISE NOTICE '🔑 Test API key created:';
        RAISE NOTICE '   ID: %', v_result.api_key_id;
        RAISE NOTICE '   Hash: %', v_result.api_key_hash;
        RAISE NOTICE '   Expires: %', v_result.expires_at;
        RAISE NOTICE '';
    END IF;
END $$;

-- =====================================================
-- PART 11: VERIFICATION AND SUMMARY
-- =====================================================

DO $$
DECLARE
    v_company_count INTEGER;
    v_api_key_count INTEGER;
    v_rate_limit_count INTEGER;
    v_rls_enabled BOOLEAN;
    v_policy_count INTEGER;
BEGIN
    -- Count companies
    SELECT COUNT(*) INTO v_company_count FROM companies;
    
    -- Count API keys
    SELECT COUNT(*) INTO v_api_key_count FROM api_keys;
    
    -- Count rate limits
    SELECT COUNT(*) INTO v_rate_limit_count FROM api_key_rate_limits;
    
    -- Check RLS status
    SELECT relrowsecurity INTO v_rls_enabled 
    FROM pg_class 
    WHERE relname = 'companies';
    
    -- Count policies
    SELECT COUNT(*) INTO v_policy_count 
    FROM pg_policies 
    WHERE tablename = 'companies';
    
    -- Display summary
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ PRODUCTION SETUP COMPLETE!';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Database Status:';
    RAISE NOTICE '   Companies: % records', v_company_count;
    RAISE NOTICE '   API Keys: % configured', v_api_key_count;
    RAISE NOTICE '   Rate Limits: % configured', v_rate_limit_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security Status:';
    RAISE NOTICE '   Row Level Security: %', CASE WHEN v_rls_enabled THEN 'Enabled ✅' ELSE 'Disabled ❌' END;
    RAISE NOTICE '   Security Policies: % configured', v_policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    
    -- Warnings
    IF v_company_count = 0 THEN
        RAISE WARNING '';
        RAISE WARNING '⚠️  No companies found in database!';
        RAISE WARNING '   Please run the populate-companies script.';
    END IF;
    
    IF v_api_key_count = 0 THEN
        RAISE WARNING '';
        RAISE WARNING '⚠️  No API keys configured!';
        RAISE WARNING '   Use the create-production-api-key.js script to generate keys.';
    END IF;
END $$;

-- =====================================================
-- PART 12: DISPLAY CURRENT CONFIGURATION
-- =====================================================

-- Show summary table
SELECT 
    'Companies' as component,
    COUNT(*)::text as count,
    CASE 
        WHEN COUNT(*) > 4000 THEN '✅ Ready'
        WHEN COUNT(*) > 0 THEN '⚠️ Partial'
        ELSE '❌ Empty'
    END as status
FROM companies

UNION ALL

SELECT 
    'API Keys' as component,
    COUNT(*)::text as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Configured'
        ELSE '⚠️ None'
    END as status
FROM api_keys

UNION ALL

SELECT 
    'Rate Limits' as component,
    COUNT(*)::text as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Active'
        ELSE '⚠️ None'
    END as status
FROM api_key_rate_limits

UNION ALL

SELECT 
    'Row Level Security' as component,
    '1' as count,
    CASE 
        WHEN relrowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as status
FROM pg_class
WHERE relname = 'companies'

ORDER BY component;

-- =====================================================
-- END OF PRODUCTION SETUP
-- =====================================================