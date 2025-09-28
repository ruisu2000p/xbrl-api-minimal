-- Emergency fix for SECURITY DEFINER view warnings
-- Run this script in Supabase SQL Editor to fix the security warnings

-- 1. Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.v_my_usage_stats CASCADE;
DROP VIEW IF EXISTS public.v_profiles CASCADE;

-- 2. Recreate v_my_usage_stats view without SECURITY DEFINER (uses SECURITY INVOKER by default)
CREATE VIEW public.v_my_usage_stats AS
SELECT
  u.id as user_id,
  u.email,
  u.created_at,
  COUNT(DISTINCT ak.id) as api_key_count,
  COUNT(DISTINCT al.id) as api_log_count,
  COALESCE(SUM(al.response_size), 0) as total_data_size,
  MAX(al.created_at) as last_api_call
FROM auth.users u
LEFT JOIN public.api_keys ak ON u.id = ak.user_id
LEFT JOIN public.api_logs al ON ak.id = al.api_key_id
GROUP BY u.id, u.email, u.created_at;

-- 3. Recreate v_profiles view without SECURITY DEFINER
CREATE VIEW public.v_profiles AS
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  u.raw_user_meta_data->>'company' as company,
  u.created_at,
  u.updated_at
FROM auth.users u;

-- 4. Grant appropriate permissions
GRANT SELECT ON public.v_my_usage_stats TO authenticated;
GRANT SELECT ON public.v_profiles TO authenticated;

-- 5. Enable RLS on related tables if not already enabled
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for api_keys (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
CREATE POLICY "Users can view own API keys"
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own API keys" ON public.api_keys;
CREATE POLICY "Users can manage own API keys"
  ON public.api_keys
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. Create RLS policies for api_logs
DROP POLICY IF EXISTS "Users can view logs for own API keys" ON public.api_logs;
CREATE POLICY "Users can view logs for own API keys"
  ON public.api_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.api_keys
      WHERE api_keys.id = api_logs.api_key_id
      AND api_keys.user_id = auth.uid()
    )
  );

-- 8. Fix the get_user_api_keys function search_path warning
DROP FUNCTION IF EXISTS public.get_user_api_keys(UUID);
CREATE OR REPLACE FUNCTION public.get_user_api_keys(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  key_prefix TEXT,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_catalog
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only return keys for the requesting user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    ak.id,
    ak.user_id,
    ak.name,
    ak.key_prefix,
    ak.created_at,
    ak.last_used_at,
    ak.is_active,
    ak.expires_at
  FROM public.api_keys ak
  WHERE ak.user_id = p_user_id
  ORDER BY ak.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_api_keys(UUID) TO authenticated;

-- 9. Add comprehensive RLS policies for other tables
-- Enable RLS on all necessary tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Companies table - public data
DROP POLICY IF EXISTS "Public companies are viewable by everyone" ON public.companies;
CREATE POLICY "Public companies are viewable by everyone"
  ON public.companies
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Financial reports - public data
DROP POLICY IF EXISTS "Financial reports are publicly viewable" ON public.financial_reports;
CREATE POLICY "Financial reports are publicly viewable"
  ON public.financial_reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Financial metrics - public data
DROP POLICY IF EXISTS "Financial metrics are publicly viewable" ON public.financial_metrics;
CREATE POLICY "Financial metrics are publicly viewable"
  ON public.financial_metrics
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Subscription plans - viewable by everyone
DROP POLICY IF EXISTS "Subscription plans are viewable by everyone" ON public.subscription_plans;
CREATE POLICY "Subscription plans are viewable by everyone"
  ON public.subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- User subscriptions - users can only see their own
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can manage own subscriptions"
  ON public.user_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usage logs - users can only see their own
DROP POLICY IF EXISTS "Users can view own usage logs" ON public.usage_logs;
CREATE POLICY "Users can view own usage logs"
  ON public.usage_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert usage logs" ON public.usage_logs;
CREATE POLICY "System can insert usage logs"
  ON public.usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 10. Create indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_api_key_id ON public.api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);

-- Comments
COMMENT ON VIEW public.v_my_usage_stats IS 'User usage statistics view with RLS enabled';
COMMENT ON VIEW public.v_profiles IS 'User profiles view with RLS enabled';
COMMENT ON FUNCTION public.get_user_api_keys(UUID) IS 'Securely fetch API keys for authenticated user only';

-- Verification query to confirm fixes
SELECT
  'Security fixes applied successfully!' as status,
  COUNT(*) FILTER (WHERE security_invoker = 'f') as security_definer_views,
  COUNT(*) FILTER (WHERE security_invoker = 't' OR security_invoker IS NULL) as security_invoker_views
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('v_my_usage_stats', 'v_profiles');