-- Force remove problematic views and check what's preventing deletion

-- 1. Check if views exist and their dependencies
SELECT
  v.schemaname,
  v.viewname,
  v.viewowner,
  pg_get_viewdef(c.oid) as view_definition
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
WHERE v.schemaname = 'public'
  AND v.viewname IN ('v_my_usage_stats', 'v_profiles');

-- 2. Check for dependencies
SELECT
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_view,
  source_ns.nspname as source_schema,
  source_table.relname as source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
WHERE
  source_ns.nspname = 'public'
  AND source_table.relname IN ('v_my_usage_stats', 'v_profiles')
  AND pg_depend.deptype = 'n';

-- 3. Force drop with CASCADE (this will drop dependent objects too)
DROP VIEW IF EXISTS public.v_my_usage_stats CASCADE;
DROP VIEW IF EXISTS public.v_profiles CASCADE;

-- 4. Double check they're gone
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'SUCCESS: Views have been removed!'
    ELSE 'ERROR: Views still exist!'
  END as status,
  COUNT(*) as remaining_views
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_my_usage_stats', 'v_profiles');

-- 5. Check for any SECURITY DEFINER views remaining
SELECT
  n.nspname as schema_name,
  c.relname as view_name,
  pg_get_userbyid(c.relowner) as owner,
  CASE c.relkind
    WHEN 'v' THEN 'VIEW'
    WHEN 'm' THEN 'MATERIALIZED VIEW'
  END as type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('v', 'm')
  AND n.nspname = 'public'
  AND EXISTS (
    SELECT 1
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    WHERE r.ev_class = c.oid
      AND d.classid = 'pg_rewrite'::regclass
  )
ORDER BY n.nspname, c.relname;

-- 6. Alternative: Recreate views without SECURITY DEFINER if they must exist
-- Only run this if the views are required for backward compatibility
/*
-- Create temporary safe views (optional - only if needed)
CREATE OR REPLACE VIEW public.v_my_usage_stats_safe
WITH (security_invoker = true) AS
SELECT
  auth.uid() as user_id,
  'hidden@example.com' as email,
  now() as created_at,
  0::bigint as api_key_count,
  0::bigint as api_log_count,
  0::numeric as total_data_size,
  null::timestamptz as last_api_call
WHERE auth.uid() IS NOT NULL;

CREATE OR REPLACE VIEW public.v_profiles_safe
WITH (security_invoker = true) AS
SELECT
  auth.uid() as id,
  'hidden@example.com' as email,
  ''::text as name,
  ''::text as company,
  now() as created_at,
  now() as updated_at
WHERE auth.uid() IS NOT NULL;

-- Grant minimal permissions
GRANT SELECT ON public.v_my_usage_stats_safe TO authenticated;
GRANT SELECT ON public.v_profiles_safe TO authenticated;
*/