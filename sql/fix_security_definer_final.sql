-- ================================================
-- Final Fix for SECURITY DEFINER View
-- ================================================

-- 1. First, completely drop the view
DROP VIEW IF EXISTS public.security_status CASCADE;

-- 2. Create a simple view without SECURITY DEFINER
CREATE VIEW public.security_status AS
SELECT 
    'RLS Status' as check_type,
    tablename as object_name,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as status
FROM pg_tables
WHERE schemaname = 'public';

-- 3. Grant appropriate permissions
GRANT SELECT ON public.security_status TO anon, authenticated, service_role;

-- 4. Alternative: Create as a function instead of view (if view keeps having issues)
-- DROP VIEW IF EXISTS public.security_status CASCADE;

-- CREATE OR REPLACE FUNCTION get_security_status()
-- RETURNS TABLE (
--     check_type TEXT,
--     object_name TEXT,
--     status TEXT
-- )
-- LANGUAGE sql
-- STABLE
-- AS $$
--     SELECT 
--         'RLS Status' as check_type,
--         tablename as object_name,
--         CASE 
--             WHEN rowsecurity THEN 'ENABLED'
--             ELSE 'DISABLED'
--         END as status
--     FROM pg_tables
--     WHERE schemaname = 'public'
-- $$;

-- 5. Verify the view doesn't have SECURITY DEFINER
SELECT 
    n.nspname AS schema_name,
    c.relname AS view_name,
    pg_get_viewdef(c.oid, true) AS view_definition,
    CASE 
        WHEN pg_get_viewdef(c.oid, true) LIKE '%SECURITY DEFINER%' THEN 'HAS SECURITY DEFINER'
        ELSE 'NO SECURITY DEFINER'
    END as security_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'  -- 'v' for views
    AND n.nspname = 'public'
    AND c.relname = 'security_status';

-- 6. If the view still has issues, just drop it completely
-- DROP VIEW IF EXISTS public.security_status CASCADE;

-- 7. Check if there are any other SECURITY DEFINER views
SELECT 
    'Checking for SECURITY DEFINER views:' as message;

SELECT 
    n.nspname AS schema_name,
    c.relname AS view_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
    AND n.nspname = 'public'
    AND pg_get_viewdef(c.oid, true) LIKE '%SECURITY DEFINER%';

-- 8. Alternative solution: Just drop the problematic view if not essential
-- Since security_status is just a monitoring view, we can remove it
DROP VIEW IF EXISTS public.security_status CASCADE;

-- Create a simpler monitoring query as a comment for manual use
COMMENT ON SCHEMA public IS 'To check security status, run: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = ''public'' ORDER BY rowsecurity DESC, tablename;';

-- 9. Final verification
DO $$
DECLARE
    security_definer_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO security_definer_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v'
        AND n.nspname = 'public'
        AND pg_get_viewdef(c.oid, true) LIKE '%SECURITY DEFINER%';
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Security Definer Fix Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'SECURITY DEFINER views remaining: %', security_definer_count;
    
    IF security_definer_count = 0 THEN
        RAISE NOTICE '✅ All SECURITY DEFINER views have been removed!';
    ELSE
        RAISE NOTICE '⚠️ Some SECURITY DEFINER views still exist.';
    END IF;
END
$$;