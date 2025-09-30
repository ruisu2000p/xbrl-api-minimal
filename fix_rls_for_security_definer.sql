-- Fix RLS: Allow SECURITY DEFINER functions to access markdown_files_metadata
-- The issue: RLS is enabled but there's no policy for the postgres role (function definer)
-- SECURITY DEFINER functions run with the definer's privileges, so they need a policy

-- Drop old policy
DROP POLICY IF EXISTS "Authenticated users can read metadata" ON private.markdown_files_metadata;

-- Create comprehensive read policy for authenticated users
CREATE POLICY "authenticated_read_markdown_metadata"
  ON private.markdown_files_metadata
  FOR SELECT
  TO authenticated
  USING (true);

-- CRITICAL: Add policy for postgres role to allow SECURITY DEFINER functions to work
-- Without this, the RPC function cannot access the table even with SECURITY DEFINER
CREATE POLICY "postgres_full_access_markdown_metadata"
  ON private.markdown_files_metadata
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Verify the policies are created
SELECT
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'private'
  AND tablename = 'markdown_files_metadata'
ORDER BY policyname;