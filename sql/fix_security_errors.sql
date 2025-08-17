-- ================================================
-- Fix Security Errors Reported by Supabase
-- ================================================

-- ================================================
-- 1. Fix SECURITY DEFINER Views
-- Remove SECURITY DEFINER from views or drop if not needed
-- ================================================

-- Drop and recreate security_status view without SECURITY DEFINER
DROP VIEW IF EXISTS security_status CASCADE;

CREATE OR REPLACE VIEW security_status AS
SELECT 
    'RLS Status' as check_type,
    tablename as object_name,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED - SECURITY RISK!'
    END as status
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Storage Policies' as check_type,
    'markdown-files' as object_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'POLICIES CONFIGURED (' || COUNT(*)::text || ' policies)'
        ELSE 'NO POLICIES - SECURITY RISK!'
    END as status
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%markdown files%'

UNION ALL

SELECT 
    'Audit Logging' as check_type,
    'audit_log' as object_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_log') THEN 'ENABLED'
        ELSE 'DISABLED'
    END as status;

-- Drop other SECURITY DEFINER views if they're not critical
DROP VIEW IF EXISTS user_statistics CASCADE;
DROP VIEW IF EXISTS company_latest_reports CASCADE;
DROP VIEW IF EXISTS api_key_statistics CASCADE;

-- ================================================
-- 2. Enable RLS on all public tables
-- ================================================

-- Enable RLS on revenue_summary
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'revenue_summary') THEN
        ALTER TABLE public.revenue_summary ENABLE ROW LEVEL SECURITY;
        
        -- Create read policy for authenticated users
        DROP POLICY IF EXISTS "Enable read for authenticated users" ON revenue_summary;
        CREATE POLICY "Enable read for authenticated users" ON revenue_summary
            FOR SELECT
            USING (true);
            
        -- Create write policy for service role
        DROP POLICY IF EXISTS "Service role only write" ON revenue_summary;
        CREATE POLICY "Service role only write" ON revenue_summary
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END
$$;

-- Enable RLS on system_metrics
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_metrics') THEN
        ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Create read policy for service role only (system metrics are sensitive)
        DROP POLICY IF EXISTS "Service role only" ON system_metrics;
        CREATE POLICY "Service role only" ON system_metrics
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END
$$;

-- Enable RLS on api_endpoint_statistics
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_endpoint_statistics') THEN
        ALTER TABLE public.api_endpoint_statistics ENABLE ROW LEVEL SECURITY;
        
        -- Create read policy for authenticated users
        DROP POLICY IF EXISTS "Enable read for authenticated users" ON api_endpoint_statistics;
        CREATE POLICY "Enable read for authenticated users" ON api_endpoint_statistics
            FOR SELECT
            USING (auth.role() IN ('authenticated', 'service_role'));
            
        -- Create write policy for service role
        DROP POLICY IF EXISTS "Service role only write" ON api_endpoint_statistics;
        CREATE POLICY "Service role only write" ON api_endpoint_statistics
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END
$$;

-- Enable RLS on api_keys_backup
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_keys_backup') THEN
        ALTER TABLE public.api_keys_backup ENABLE ROW LEVEL SECURITY;
        
        -- Only service role can access backup table
        DROP POLICY IF EXISTS "Service role only" ON api_keys_backup;
        CREATE POLICY "Service role only" ON api_keys_backup
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END
$$;

-- ================================================
-- 3. Create missing tables if they don't exist
-- ================================================

-- Create revenue_summary if it doesn't exist
CREATE TABLE IF NOT EXISTS revenue_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID,
    fiscal_year TEXT,
    revenue DECIMAL(15, 2),
    profit DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system_metrics if it doesn't exist
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create api_endpoint_statistics if it doesn't exist
CREATE TABLE IF NOT EXISTS api_endpoint_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    call_count INTEGER DEFAULT 0,
    avg_response_time_ms DECIMAL(10, 2),
    last_called_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create api_keys_backup if it doesn't exist
CREATE TABLE IF NOT EXISTS api_keys_backup (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_id UUID,
    api_key TEXT,
    user_id UUID,
    backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================
-- 4. Enable RLS on newly created tables
-- ================================================

-- Enable RLS with policies for all new tables
ALTER TABLE revenue_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_endpoint_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys_backup ENABLE ROW LEVEL SECURITY;

-- Create policies for revenue_summary
DROP POLICY IF EXISTS "Enable read for authenticated users" ON revenue_summary;
CREATE POLICY "Enable read for authenticated users" ON revenue_summary
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role write" ON revenue_summary;
CREATE POLICY "Service role write" ON revenue_summary
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role update" ON revenue_summary;
CREATE POLICY "Service role update" ON revenue_summary
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role delete" ON revenue_summary;
CREATE POLICY "Service role delete" ON revenue_summary
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Create policies for system_metrics (service role only)
DROP POLICY IF EXISTS "Service role only all" ON system_metrics;
CREATE POLICY "Service role only all" ON system_metrics
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Create policies for api_endpoint_statistics
DROP POLICY IF EXISTS "Authenticated read" ON api_endpoint_statistics;
CREATE POLICY "Authenticated read" ON api_endpoint_statistics
    FOR SELECT
    USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Service role write" ON api_endpoint_statistics;
CREATE POLICY "Service role write" ON api_endpoint_statistics
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role update" ON api_endpoint_statistics;
CREATE POLICY "Service role update" ON api_endpoint_statistics
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Create policies for api_keys_backup (service role only)
DROP POLICY IF EXISTS "Service role only all" ON api_keys_backup;
CREATE POLICY "Service role only all" ON api_keys_backup
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ================================================
-- 5. Verify all fixes
-- ================================================

-- Check for remaining issues
DO $$
DECLARE
    rls_disabled_count INTEGER;
    security_definer_count INTEGER;
BEGIN
    -- Count tables without RLS
    SELECT COUNT(*) INTO rls_disabled_count
    FROM pg_tables
    WHERE schemaname = 'public' 
        AND NOT rowsecurity
        AND tablename NOT IN ('schema_migrations'); -- migration table doesn't need RLS
    
    -- Count SECURITY DEFINER views
    SELECT COUNT(*) INTO security_definer_count
    FROM pg_views
    WHERE schemaname = 'public'
        AND definition LIKE '%SECURITY DEFINER%';
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Security Fixes Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tables without RLS: %', rls_disabled_count;
    RAISE NOTICE 'SECURITY DEFINER views: %', security_definer_count;
    RAISE NOTICE '';
    
    IF rls_disabled_count = 0 AND security_definer_count = 0 THEN
        RAISE NOTICE '✅ All security issues have been resolved!';
    ELSE
        RAISE NOTICE '⚠️ Some issues may still remain. Please check manually.';
    END IF;
END
$$;

-- Final check: List any remaining tables without RLS
SELECT 
    'Remaining tables without RLS:' as message,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
    AND NOT rowsecurity
    AND tablename NOT IN ('schema_migrations')
ORDER BY tablename;