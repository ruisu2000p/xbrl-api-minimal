-- ==========================================
-- RLS Performance Optimization
-- ==========================================
-- Fix auth_rls_initplan and multiple_permissive_policies warnings

-- 1) Drop existing policies that need to be optimized
-- private.api_keys
DROP POLICY IF EXISTS "Users can view own API keys" ON private.api_keys;
DROP POLICY IF EXISTS "Users can manage own API keys" ON private.api_keys;
DROP POLICY IF EXISTS "Authenticated users can view own API keys" ON private.api_keys;
DROP POLICY IF EXISTS "Authenticated users can create own API keys" ON private.api_keys;
DROP POLICY IF EXISTS "Authenticated users can update own API keys" ON private.api_keys;
DROP POLICY IF EXISTS "Authenticated users can delete own API keys" ON private.api_keys;

-- private.api_usage_log (if exists)
DROP POLICY IF EXISTS "Users can view logs for own API keys" ON private.api_usage_log;

-- private.api_usage_logs
DROP POLICY IF EXISTS "Users can view own usage logs" ON private.api_usage_logs;
DROP POLICY IF EXISTS "System can insert usage logs" ON private.api_usage_logs;

-- private.user_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON private.user_subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON private.user_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON private.user_subscriptions;

-- private.companies
DROP POLICY IF EXISTS "Authenticated users can read companies" ON private.companies;
DROP POLICY IF EXISTS "Public companies are viewable by everyone" ON private.companies;

-- private.subscription_plans
DROP POLICY IF EXISTS "Authenticated users can read subscription plans" ON private.subscription_plans;
DROP POLICY IF EXISTS "Subscription plans are viewable by everyone" ON private.subscription_plans;

-- 2) Create optimized consolidated policies
-- private.api_keys (consolidate all operations)
CREATE POLICY "api_keys_unified_policy"
ON private.api_keys
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- private.api_usage_log (if table exists - uses key_id column)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'private' AND tablename = 'api_usage_log'
  ) THEN
    EXECUTE 'CREATE POLICY "api_usage_log_view_own"
      ON private.api_usage_log
      FOR SELECT
      TO authenticated
      USING (
        key_id IN (
          SELECT id FROM private.api_keys WHERE user_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;

-- private.api_usage_logs
CREATE POLICY "api_usage_logs_view_own"
ON private.api_usage_logs
FOR SELECT
TO authenticated
USING (
  api_key_id IN (
    SELECT id FROM private.api_keys WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "api_usage_logs_system_insert"
ON private.api_usage_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- private.user_subscriptions (consolidate all operations)
CREATE POLICY "user_subscriptions_unified_policy"
ON private.user_subscriptions
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- private.companies (consolidate read access)
CREATE POLICY "companies_read_policy"
ON private.companies
FOR SELECT
TO authenticated
USING (true);  -- All authenticated users can read all companies

-- private.subscription_plans (consolidate read access)
CREATE POLICY "subscription_plans_read_policy"
ON private.subscription_plans
FOR SELECT
TO authenticated
USING (true);  -- All authenticated users can read all plans

-- 3) Add comments
COMMENT ON POLICY "api_keys_unified_policy" ON private.api_keys
IS 'Optimized unified policy: users can manage their own API keys (SELECT, INSERT, UPDATE, DELETE)';

COMMENT ON POLICY "api_usage_logs_view_own" ON private.api_usage_logs
IS 'Optimized policy: users can view usage logs for their own API keys';

COMMENT ON POLICY "api_usage_logs_system_insert" ON private.api_usage_logs
IS 'Service role can insert usage logs';

COMMENT ON POLICY "user_subscriptions_unified_policy" ON private.user_subscriptions
IS 'Optimized unified policy: users can manage their own subscriptions (SELECT, INSERT, UPDATE, DELETE)';

COMMENT ON POLICY "companies_read_policy" ON private.companies
IS 'Optimized policy: all authenticated users can read companies';

COMMENT ON POLICY "subscription_plans_read_policy" ON private.subscription_plans
IS 'Optimized policy: all authenticated users can read subscription plans';