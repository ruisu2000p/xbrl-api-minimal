-- Verify Production Setup
-- Run this to confirm everything is configured correctly

-- 1. Check companies table
SELECT 
    'Companies Table' as check_item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 4000 THEN '✅ OK'
        ELSE '❌ Need to populate data'
    END as status
FROM companies

UNION ALL

-- 2. Check API keys
SELECT 
    'API Keys' as check_item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK'
        ELSE '⚠️ No keys created yet'
    END as status
FROM api_keys

UNION ALL

-- 3. Check rate limits
SELECT 
    'Rate Limits' as check_item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK'
        ELSE '⚠️ No limits configured'
    END as status
FROM api_key_rate_limits

UNION ALL

-- 4. Check RLS on companies
SELECT 
    'Row Level Security' as check_item,
    CASE 
        WHEN relrowsecurity THEN 1
        ELSE 0
    END as count,
    CASE 
        WHEN relrowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as status
FROM pg_class
WHERE relname = 'companies'

UNION ALL

-- 5. Check policies
SELECT 
    'Security Policies' as check_item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Configured'
        ELSE '❌ No policies'
    END as status
FROM pg_policies
WHERE tablename = 'companies';

-- 6. Show API key details if any exist
SELECT 
    '--- API Keys Detail ---' as info,
    id,
    name,
    COALESCE(tier, 'free') as tier,
    status,
    created_at,
    expires_at
FROM api_keys
LIMIT 5;

-- 7. Show current statistics
SELECT 
    '--- System Statistics ---' as info,
    'Total Companies' as metric,
    COUNT(*)::text as value
FROM companies
UNION ALL
SELECT 
    '' as info,
    'Active API Keys' as metric,
    COUNT(*)::text as value
FROM api_keys
WHERE status = 'active'
UNION ALL
SELECT 
    '' as info,
    'Total API Calls Today' as metric,
    COALESCE(COUNT(*)::text, '0') as value
FROM api_key_usage_logs
WHERE created_at >= CURRENT_DATE;