-- Fix RLS policy for account_deletions table
--
-- Problem: service_role was getting 401 Unauthorized when trying to INSERT
-- Cause: The original policy used USING clause only, which doesn't work for INSERTs,
--        and auth.role() doesn't properly identify service_role
-- Solution: Use TO service_role with both USING and WITH CHECK clauses

-- Drop the incorrect policy
DROP POLICY IF EXISTS service_role_only ON account_deletions;

-- Create correct policy that allows service_role full access
CREATE POLICY service_role_full_access ON account_deletions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY service_role_full_access ON account_deletions IS 'Allow service_role full access to account_deletions table';
