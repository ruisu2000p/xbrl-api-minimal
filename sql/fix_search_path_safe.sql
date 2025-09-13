-- ================================================
-- Fix Function Search Path (Safe Version)
-- Only updates functions that actually exist
-- ================================================

-- First, let's see what functions actually exist
SELECT 
    'Checking existing functions in public schema:' as message;

SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ================================================
-- Generic fix for ALL existing functions
-- This will only update functions that actually exist
-- ================================================

DO $$
DECLARE
    func RECORD;
    func_signature TEXT;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Fixing search_path for all public functions';
    RAISE NOTICE '================================================';
    
    -- Loop through all functions in public schema
    FOR func IN 
        SELECT 
            p.oid,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS arguments
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname
    LOOP
        -- Build function signature
        func_signature := 'public.' || func.function_name || '(' || func.arguments || ')';
        
        -- Try to set search_path for the function
        BEGIN
            EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', func_signature);
            RAISE NOTICE '✓ Fixed: %', func.function_name;
            success_count := success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ Error fixing %: %', func.function_name, SQLERRM;
            error_count := error_count + 1;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Summary';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Successfully fixed: % functions', success_count;
    RAISE NOTICE 'Errors encountered: % functions', error_count;
END $$;

-- ================================================
-- Verify the fixes
-- ================================================

SELECT 
    'Verification - Functions with their search_path status:' as message;

SELECT 
    p.proname AS function_name,
    CASE 
        WHEN p.proconfig IS NULL THEN 'NOT SET (Mutable)'
        WHEN 'search_path=public, pg_catalog' = ANY(p.proconfig) THEN 'FIXED (Secure)'
        WHEN 'search_path' = ANY(array(select split_part(unnest(p.proconfig), '=', 1))) THEN 'SET (Custom)'
        ELSE 'NOT SET (Mutable)'
    END AS search_path_status,
    p.proconfig AS current_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY 
    CASE 
        WHEN p.proconfig IS NULL THEN 1
        WHEN 'search_path=public, pg_catalog' = ANY(p.proconfig) THEN 3
        ELSE 2
    END,
    p.proname;

-- ================================================
-- Count remaining issues
-- ================================================

DO $$
DECLARE
    total_functions INTEGER;
    secured_functions INTEGER;
    mutable_functions INTEGER;
BEGIN
    -- Count total functions
    SELECT COUNT(*) INTO total_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    -- Count secured functions
    SELECT COUNT(*) INTO secured_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
        AND p.proconfig IS NOT NULL
        AND 'search_path=public, pg_catalog' = ANY(p.proconfig);
    
    -- Count mutable functions
    SELECT COUNT(*) INTO mutable_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
        AND (p.proconfig IS NULL 
            OR NOT 'search_path=public, pg_catalog' = ANY(p.proconfig));
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Final Status';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total functions in public schema: %', total_functions;
    RAISE NOTICE 'Secured functions: %', secured_functions;
    RAISE NOTICE 'Functions still mutable: %', mutable_functions;
    RAISE NOTICE '';
    
    IF mutable_functions = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All functions have been secured!';
    ELSIF secured_functions > 0 THEN
        RAISE NOTICE '⚠️  PARTIAL SUCCESS: Some functions secured, but % remain mutable', mutable_functions;
    ELSE
        RAISE NOTICE '❌ WARNING: No functions were secured. Please check for errors above.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Authentication warnings must be fixed in the Supabase Dashboard:';
    RAISE NOTICE '1. Go to Authentication > Security';
    RAISE NOTICE '2. Enable "Leaked Password Protection"';
    RAISE NOTICE '3. Go to Authentication > Providers';
    RAISE NOTICE '4. Enable additional MFA methods (TOTP, SMS, etc.)';
END $$;