-- Option 1: ALTER VIEW to remove SECURITY DEFINER
ALTER VIEW public.markdown_files_metadata SET (security_invoker = true);

-- If the above doesn't work, try Option 2:
-- Drop and recreate without any security options (defaults to INVOKER)
BEGIN;

-- Save current grants
CREATE TEMP TABLE temp_grants AS
SELECT
    'GRANT ' || privilege_type || ' ON ' || table_schema || '.' || table_name || ' TO ' || grantee || ';' as grant_sql
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'markdown_files_metadata';

-- Drop the view
DROP VIEW IF EXISTS public.markdown_files_metadata CASCADE;

-- Recreate the view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.markdown_files_metadata AS
SELECT
  id,
  company_id,
  company_name,
  fiscal_year,
  file_name,
  file_type,
  storage_path,
  created_at,
  updated_at,
  file_size,
  english_name
FROM private.markdown_files_metadata;

-- Restore grants
GRANT SELECT ON public.markdown_files_metadata TO anon;
GRANT SELECT ON public.markdown_files_metadata TO authenticated;
GRANT SELECT ON public.markdown_files_metadata TO service_role;

-- Add comment
COMMENT ON VIEW public.markdown_files_metadata IS 'Public view of private markdown files metadata (SECURITY INVOKER)';

COMMIT;

-- Verify the change
SELECT
    n.nspname as schema_name,
    c.relname as view_name,
    c.relkind,
    CASE
        WHEN c.reloptions IS NULL THEN 'SECURITY INVOKER (default)'
        WHEN array_to_string(c.reloptions, ',') LIKE '%security_invoker=false%' THEN 'SECURITY DEFINER'
        WHEN array_to_string(c.reloptions, ',') LIKE '%security_invoker=true%' THEN 'SECURITY INVOKER'
        ELSE 'SECURITY INVOKER (default)'
    END as security_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname = 'markdown_files_metadata';