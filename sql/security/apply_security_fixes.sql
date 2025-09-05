-- Supabase Security Fixes for XBRL Project
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

-- Create new policies
CREATE POLICY "Enable read access for all users" ON companies
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Enable insert for service role only" ON companies
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Enable update for service role only" ON companies
    FOR UPDATE
    TO service_role
    USING (true);

CREATE POLICY "Enable delete for service role only" ON companies
    FOR DELETE
    TO service_role
    USING (true);

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
            TO authenticated
            USING (true);
            
        CREATE POLICY "Enable write for service role only" ON financial_documents
            FOR ALL
            TO service_role
            USING (true);
    END IF;
END
$$;

-- ================================================
-- 3. Storage bucket policies for markdown-files
-- ================================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated read markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role upload markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role update markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role delete markdown files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read markdown files" ON storage.objects;

-- Create storage policies
-- Allow public read (if needed for your application)
CREATE POLICY "Allow public read markdown files" ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'markdown-files');

-- Service role full access
CREATE POLICY "Allow service role full access markdown files" ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'markdown-files');

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

-- Only service role can write to audit log
CREATE POLICY "Service role only for audit log" ON audit_log
    FOR ALL
    TO service_role
    USING (true);

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

-- Service role only
CREATE POLICY "Service role only for api_usage" ON api_usage
    FOR ALL
    TO service_role
    USING (true);

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
    bucket_id as object_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'POLICIES CONFIGURED'
        ELSE 'NO POLICIES - SECURITY RISK!'
    END as status
FROM storage.buckets b
LEFT JOIN pg_policies p ON p.tablename = 'objects'
WHERE b.name = 'markdown-files'
GROUP BY bucket_id;

-- ================================================
-- Completion message
-- ================================================

DO $$
BEGIN
    RAISE NOTICE 'Security fixes applied successfully!';
    RAISE NOTICE 'Please review the security_status view to check current security state';
    RAISE NOTICE 'Run: SELECT * FROM security_status;';
END
$$;