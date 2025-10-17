-- Fix RLS policies for account deletion process
--
-- Problem: service_role cannot SELECT/UPDATE/INSERT on deletion-related tables
-- Cause: Missing service_role policies for these operations
-- Solution: Add comprehensive service_role policies

-- account_deletions: Allow service_role SELECT for idempotency check
CREATE POLICY service_role_select_account_deletions ON account_deletions
  FOR SELECT
  TO service_role
  USING (true);

-- account_deletions: Keep existing INSERT policy (already exists from previous migration)
-- This comment documents that service_role_full_access policy already covers INSERT

-- user_subscriptions: Allow service_role to UPDATE (in private schema)
CREATE POLICY service_role_update_user_subscriptions ON private.user_subscriptions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- api_keys: Allow service_role to UPDATE (in private schema)
CREATE POLICY service_role_update_api_keys ON private.api_keys
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY service_role_select_account_deletions ON account_deletions IS 'Allow service_role to check for existing deletions (idempotency)';
COMMENT ON POLICY service_role_update_user_subscriptions ON private.user_subscriptions IS 'Allow service_role to update subscriptions for account deletion';
COMMENT ON POLICY service_role_update_api_keys ON private.api_keys IS 'Allow service_role to revoke API keys for account deletion';
