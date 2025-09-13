-- Check Security Status
SELECT * FROM security_status
ORDER BY check_type, object_name;

-- Check RLS status for specific tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies on companies table
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- Check storage policies
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'objects' 
    AND policyname LIKE '%markdown%'
ORDER BY policyname;

-- Check if audit_log table exists and has data
SELECT 
    'Audit Log Status' as check,
    COUNT(*) as record_count,
    MIN(created_at) as first_record,
    MAX(created_at) as last_record
FROM audit_log;

-- Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('companies', 'api_usage', 'audit_log')
ORDER BY tablename, indexname;