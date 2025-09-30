-- First, completely drop the view and any dependencies
DROP VIEW IF EXISTS public.markdown_files_metadata CASCADE;

-- Wait a moment for the drop to complete
SELECT pg_sleep(1);

-- Verify the view is gone
SELECT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'markdown_files_metadata'
) AS view_exists;

-- Create new view explicitly with SECURITY INVOKER
CREATE VIEW public.markdown_files_metadata
WITH (security_invoker = true) AS
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

-- Grant permissions
GRANT SELECT ON public.markdown_files_metadata TO anon, authenticated, service_role;

-- Add comment
COMMENT ON VIEW public.markdown_files_metadata IS 'Public view of private markdown files metadata table with SECURITY INVOKER';

-- Verify the new view exists and check its security
SELECT
    n.nspname AS schema,
    c.relname AS view_name,
    pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname = 'markdown_files_metadata';