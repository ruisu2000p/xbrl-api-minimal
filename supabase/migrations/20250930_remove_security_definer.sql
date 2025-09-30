-- Remove SECURITY DEFINER from view
DROP VIEW IF EXISTS public.markdown_files_metadata CASCADE;

-- Recreate view WITHOUT SECURITY DEFINER (default is SECURITY INVOKER)
CREATE VIEW public.markdown_files_metadata AS
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
COMMENT ON VIEW public.markdown_files_metadata IS 'Public view of private markdown files metadata table (SECURITY INVOKER)';