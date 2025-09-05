-- Supabase Security Fixes for XBRL Project (Version 2 - Fixed)
-- Project: zxzyidqrvzfzhicfuhlo
-- Date: 2025-08-17

-- ================================================
-- 1. Enable RLS on companies table
-- ================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
DROP POLICY IF EXISTS "Enable insert for service role only" ON companies;
DROP POLICY IF EXISTS "Enable update for service role only" ON companies;
DROP POLICY IF EXISTS "Enable delete for service role only" ON companies;

-- Create new policies with correct syntax
CREATE POLICY "Enable read access for all users" ON companies
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for service role only" ON companies
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role only" ON companies
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable delete for service role only" ON companies
    FOR DELETE
    USING (auth.role() = 'service_role');

-- ================================================
-- 2. Enable RLS on financial_documents table (if exists)
-- ================================================

-- Check if table exists and enable RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'financial_documents') THEN
        ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Enable read for authenticated users" ON financial_documents;
        DROP POLICY IF EXISTS "Enable write for service role only" ON financial_documents;
        
        -- Create new policies
        CREATE POLICY "Enable read for authenticated users" ON financial_documents
            FOR SELECT
            USING (true);
            
        CREATE POLICY "Enable insert for service role" ON financial_documents
            FOR INSERT
            WITH CHECK (auth.role() = 'service_role');
            
        CREATE POLICY "Enable update for service role" ON financial_documents
            FOR UPDATE
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
            
        CREATE POLICY "Enable delete for service role" ON financial_documents
            FOR DELETE
            USING (auth.role() = 'service_role');
    END IF;
END
$$;

-- ================================================
-- 3. Storage bucket policies for markdown-files
-- ================================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated read markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role upload markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role update markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role delete markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access markdown files" ON storage.objects;

-- Create storage policies with correct syntax
-- Allow public read
CREATE POLICY "Allow public read markdown files" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'markdown-files');

-- Service role insert
CREATE POLICY "Allow service role insert markdown files" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'markdown-files' AND auth.role() = 'service_role');

-- Service role update
CREATE POLICY "Allow service role update markdown files" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'markdown-files' AND auth.role() = 'service_role')
    WITH CHECK (bucket_id = 'markdown-files' AND auth.role() = 'service_role');

-- Service role delete
CREATE POLICY "Allow service role delete markdown files" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'markdown-files' AND auth.role() = 'service_role');

-- ================================================
-- 4. Create audit log table and trigger
-- ================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for audit_log
CREATE POLICY "Service role insert audit log" ON audit_log
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role read audit log" ON audit_log
    FOR SELECT
    USING (auth.role() = 'service_role');

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, action, user_id, old_data)
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            auth.uid(),
            to_jsonb(OLD)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, action, user_id, old_data, new_data)
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            auth.uid(),
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, action, user_id, new_data)
        VALUES (
            TG_TABLE_NAME,
            TG_OP,
            auth.uid(),
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to important tables
DROP TRIGGER IF EXISTS companies_audit_trigger ON companies;
CREATE TRIGGER companies_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- ================================================
-- 5. Create indexes for better performance
-- ================================================

CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);

-- ================================================
-- 6. Create API usage tracking table
-- ================================================

CREATE TABLE IF NOT EXISTS api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Policies for api_usage
CREATE POLICY "Service role insert api_usage" ON api_usage
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role read api_usage" ON api_usage
    FOR SELECT
    USING (auth.role() = 'service_role');

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);

-- ================================================
-- 7. Summary view for security status
-- ================================================

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

-- ================================================
-- 8. Grant proper permissions
-- ================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on companies to anon and authenticated
GRANT SELECT ON companies TO anon, authenticated;

-- Grant all on companies to service_role
GRANT ALL ON companies TO service_role;

-- ================================================
-- Completion message
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Security fixes applied successfully!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Please run the following query to check security status:';
    RAISE NOTICE 'SELECT * FROM security_status;';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected results:';
    RAISE NOTICE '- All tables should show RLS ENABLED';
    RAISE NOTICE '- Storage should show POLICIES CONFIGURED';
    RAISE NOTICE '- Audit logging should show ENABLED';
END
$$;