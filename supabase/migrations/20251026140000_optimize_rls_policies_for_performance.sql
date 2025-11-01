-- Optimize RLS policies to prevent unnecessary re-evaluation of auth functions
-- This improves query performance at scale by wrapping auth.* functions in SELECT
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- 1. Fix private.account_deletions - service_role_only policy
-- ============================================================================
-- Before: auth.role() = 'service_role' (evaluated per row)
-- After: (SELECT auth.role()) = 'service_role' (evaluated once)

DROP POLICY IF EXISTS "service_role_only" ON private.account_deletions;

CREATE POLICY "service_role_only"
ON private.account_deletions
AS PERMISSIVE
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role');

COMMENT ON POLICY "service_role_only" ON private.account_deletions IS
  'Optimized RLS policy - auth.role() wrapped in SELECT to prevent row-by-row re-evaluation. Fixed auth_rls_initplan warning.';

-- ============================================================================
-- 2. Fix public.mail_event_log - Users can view their own mail events policy
-- ============================================================================
-- Before: auth.uid() evaluated per row in subquery
-- After: (SELECT auth.uid()) evaluated once

DROP POLICY IF EXISTS "Users can view their own mail events" ON public.mail_event_log;

CREATE POLICY "Users can view their own mail events"
ON public.mail_event_log
AS PERMISSIVE
FOR SELECT
TO public
USING (
  email = (
    SELECT users.email::text
    FROM auth.users
    WHERE users.id = (SELECT auth.uid())
  )
);

COMMENT ON POLICY "Users can view their own mail events" ON public.mail_event_log IS
  'Optimized RLS policy - auth.uid() wrapped in SELECT to prevent row-by-row re-evaluation. Fixed auth_rls_initplan warning.';

-- ============================================================================
-- Verification
-- ============================================================================
-- Run after migration to verify policies are correct:
-- SELECT schemaname, tablename, policyname, qual
-- FROM pg_policies
-- WHERE tablename IN ('mail_event_log', 'account_deletions')
-- ORDER BY schemaname, tablename;
