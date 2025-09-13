-- ================================================
-- Fix Security Warnings (Function Search Path)
-- ================================================

-- Fix search_path for all functions to prevent security issues
-- This sets an immutable search path for each function

-- 1. audit_trigger_function
ALTER FUNCTION public.audit_trigger_function() 
SET search_path = public, pg_catalog;

-- 2. check_api_key_validity (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_api_key_validity' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.check_api_key_validity(text) SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 3. get_api_key_statistics (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_api_key_statistics' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.get_api_key_statistics() SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 4. log_api_key_creation (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_api_key_creation' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.log_api_key_creation() SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 5. log_api_key_update (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_api_key_update' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.log_api_key_update() SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 6. get_all_keys_monthly_usage (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_keys_monthly_usage' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.get_all_keys_monthly_usage() SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 7. check_and_update_rate_limit (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_and_update_rate_limit' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.check_and_update_rate_limit(text) SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 8. increment_api_key_stats (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_api_key_stats' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.increment_api_key_stats(uuid) SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 9. generate_api_key (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_api_key' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.generate_api_key() SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 10. update_updated_at_column (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 11. check_rate_limit (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.check_rate_limit(text) SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 12. record_api_usage (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_api_usage' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.record_api_usage(text, text, integer) SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 13. get_api_key_stats (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_api_key_stats' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.get_api_key_stats(text) SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 14. update_api_usage_stats (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_api_usage_stats' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.update_api_usage_stats() SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 15. get_api_key_monthly_usage (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_api_key_monthly_usage' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.get_api_key_monthly_usage(text) SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 16. get_api_key_recent_activity (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_api_key_recent_activity' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.get_api_key_recent_activity(text) SET search_path = public, pg_catalog';
    END IF;
END $$;

-- 17. update_updated_at (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_catalog';
    END IF;
END $$;

-- ================================================
-- Generic fix for ALL functions in public schema
-- ================================================

DO $$
DECLARE
    func RECORD;
    func_signature TEXT;
BEGIN
    -- Loop through all functions in public schema
    FOR func IN 
        SELECT 
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS arguments
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        -- Build function signature
        func_signature := 'public.' || func.function_name || '(' || func.arguments || ')';
        
        -- Set search_path for the function
        BEGIN
            EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', func_signature);
            RAISE NOTICE 'Fixed search_path for function: %', func_signature;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix search_path for function: % (Error: %)', func_signature, SQLERRM;
        END;
    END LOOP;
END $$;

-- ================================================
-- Verify fixes
-- ================================================

-- Check functions that still have mutable search_path
SELECT 
    'Functions with fixed search_path:' as message;

SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE 
        WHEN p.proconfig IS NULL OR NOT 'search_path' = ANY(
            array(select split_part(unnest(p.proconfig), '=', 1))
        ) THEN 'MUTABLE (WARNING)'
        ELSE 'FIXED'
    END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY search_path_status DESC, function_name;

-- ================================================
-- Summary
-- ================================================

DO $$
DECLARE
    mutable_count INTEGER;
    fixed_count INTEGER;
BEGIN
    -- Count functions with mutable search_path
    SELECT COUNT(*) INTO mutable_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
        AND (p.proconfig IS NULL OR NOT 'search_path' = ANY(
            array(select split_part(unnest(p.proconfig), '=', 1))
        ));
    
    -- Count functions with fixed search_path
    SELECT COUNT(*) INTO fixed_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
        AND p.proconfig IS NOT NULL 
        AND 'search_path' = ANY(
            array(select split_part(unnest(p.proconfig), '=', 1))
        );
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Search Path Security Fix Complete';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Functions with mutable search_path: %', mutable_count;
    RAISE NOTICE 'Functions with fixed search_path: %', fixed_count;
    RAISE NOTICE '';
    
    IF mutable_count = 0 THEN
        RAISE NOTICE '✅ All function search paths have been secured!';
    ELSE
        RAISE NOTICE '⚠️ Some functions may still have mutable search paths.';
        RAISE NOTICE 'This is usually not critical but should be fixed for best security.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Note: The following warnings cannot be fixed via SQL:';
    RAISE NOTICE '1. Leaked Password Protection - Enable in Supabase Dashboard > Authentication > Security';
    RAISE NOTICE '2. MFA Options - Enable in Supabase Dashboard > Authentication > Providers';
END $$;