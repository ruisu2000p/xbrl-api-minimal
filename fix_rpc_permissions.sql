-- Fix RPC permissions for search_markdowns_secure
-- This function needs to be callable by anon role (used by Edge Functions)

GRANT EXECUTE ON FUNCTION public.search_markdowns_secure(TEXT, TEXT, TEXT, TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.search_markdowns_secure(TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;

-- Verify grants
SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'search_markdowns_secure'
ORDER BY grantee, privilege_type;