-- Fix function_search_path_mutable issue for public.norm
CREATE OR REPLACE FUNCTION public.norm(s TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT regexp_replace(
           translate(lower(coalesce(s,'')), '　／＆', ' /&'),
           '\s+', ' ', 'g'
         );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.norm(TEXT) TO public;
GRANT EXECUTE ON FUNCTION public.norm(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.norm(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.norm(TEXT) TO service_role;