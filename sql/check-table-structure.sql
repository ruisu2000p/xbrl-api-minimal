-- Check existing table structure
-- Run this first to see current database schema

-- 1. Check api_keys table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;

-- 2. Check api_key_rate_limits table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'api_key_rate_limits'
ORDER BY ordinal_position;

-- 3. Check api_key_usage_logs table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'api_key_usage_logs'
ORDER BY ordinal_position;

-- 4. Check companies table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- 5. Check existing indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('api_keys', 'api_key_rate_limits', 'api_key_usage_logs', 'companies')
ORDER BY tablename, indexname;

-- 6. Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'companies';

-- 7. Count records in each table
SELECT 
    'companies' as table_name, 
    COUNT(*) as record_count 
FROM companies
UNION ALL
SELECT 
    'api_keys' as table_name, 
    COUNT(*) as record_count 
FROM api_keys
UNION ALL
SELECT 
    'api_key_rate_limits' as table_name, 
    COUNT(*) as record_count 
FROM api_key_rate_limits
UNION ALL
SELECT 
    'api_key_usage_logs' as table_name, 
    COUNT(*) as record_count 
FROM api_key_usage_logs;