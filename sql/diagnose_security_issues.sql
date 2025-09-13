-- ================================================
-- Diagnose Security Issues
-- ================================================

-- 1. Check which tables have RLS enabled/disabled
SELECT 
    'Table RLS Status' as category,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED - SECURITY RISK'
    END as status
FROM pg_tables 
WHERE schemaname IN ('public', 'auth')
ORDER BY rowsecurity DESC, schemaname, tablename;

-- 2. Check for tables without any policies
SELECT 
    'Tables Without Policies' as category,
    t.schemaname,
    t.tablename,
    CASE 
        WHEN COUNT(p.policyname) = 0 AND t.rowsecurity THEN '⚠️ RLS ENABLED BUT NO POLICIES'
        WHEN COUNT(p.policyname) = 0 AND NOT t.rowsecurity THEN '❌ NO RLS AND NO POLICIES'
        ELSE '✅ HAS POLICIES (' || COUNT(p.policyname)::text || ')'
    END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY COUNT(p.policyname), t.tablename;

-- 3. Check storage bucket security
SELECT 
    'Storage Bucket Security' as category,
    name as bucket_name,
    public as is_public,
    CASE 
        WHEN public THEN '⚠️ PUBLIC BUCKET'
        ELSE '✅ PRIVATE BUCKET'
    END as status,
    created_at
FROM storage.buckets
ORDER BY name;

-- 4. Check for storage policies
SELECT 
    'Storage Policies' as category,
    bucket_id,
    COUNT(*) as policy_count
FROM (
    SELECT DISTINCT 
        (SELECT name FROM storage.buckets WHERE id::text = split_part(qual::text, '''', 2)) as bucket_id
    FROM pg_policies 
    WHERE tablename = 'objects'
        AND qual::text LIKE '%bucket_id%'
) as bucket_policies
WHERE bucket_id IS NOT NULL
GROUP BY bucket_id;

-- 5. Check auth schema tables
SELECT 
    'Auth Schema Tables' as category,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '⚠️ RLS DISABLED (May be intentional for auth tables)'
    END as status
FROM pg_tables 
WHERE schemaname = 'auth'
ORDER BY tablename;

-- 6. List all security issues
WITH security_issues AS (
    -- Tables without RLS
    SELECT 
        'NO_RLS' as issue_type,
        'Table without RLS: ' || tablename as description,
        'HIGH' as severity
    FROM pg_tables 
    WHERE schemaname = 'public' 
        AND NOT rowsecurity
        AND tablename NOT IN ('schema_migrations', 'security_status') -- Views don't need RLS
    
    UNION ALL
    
    -- Tables with RLS but no policies
    SELECT 
        'RLS_NO_POLICY' as issue_type,
        'RLS enabled but no policies: ' || t.tablename as description,
        'HIGH' as severity
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public' 
        AND t.rowsecurity
    GROUP BY t.tablename
    HAVING COUNT(p.policyname) = 0
    
    UNION ALL
    
    -- Public storage buckets
    SELECT 
        'PUBLIC_BUCKET' as issue_type,
        'Public storage bucket: ' || name as description,
        'MEDIUM' as severity
    FROM storage.buckets
    WHERE public = true
)
SELECT 
    ROW_NUMBER() OVER (ORDER BY 
        CASE severity 
            WHEN 'HIGH' THEN 1 
            WHEN 'MEDIUM' THEN 2 
            ELSE 3 
        END
    ) as issue_number,
    issue_type,
    description,
    severity
FROM security_issues
ORDER BY issue_number;

-- 7. Count total issues by type
SELECT 
    issue_type,
    severity,
    COUNT(*) as count
FROM (
    SELECT 
        'NO_RLS' as issue_type,
        'HIGH' as severity
    FROM pg_tables 
    WHERE schemaname = 'public' 
        AND NOT rowsecurity
        AND tablename NOT IN ('schema_migrations', 'security_status')
    
    UNION ALL
    
    SELECT 
        'RLS_NO_POLICY' as issue_type,
        'HIGH' as severity
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public' 
        AND t.rowsecurity
    GROUP BY t.tablename
    HAVING COUNT(p.policyname) = 0
    
    UNION ALL
    
    SELECT 
        'PUBLIC_BUCKET' as issue_type,
        'MEDIUM' as severity
    FROM storage.buckets
    WHERE public = true
) as all_issues
GROUP BY issue_type, severity
ORDER BY severity, issue_type;