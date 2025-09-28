-- Fix SECURITY DEFINER views by replacing with proper RLS policies
-- These views should use SECURITY INVOKER (default) instead of SECURITY DEFINER

-- Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.v_my_usage_stats CASCADE;
DROP VIEW IF EXISTS public.v_profiles CASCADE;

-- Recreate v_my_usage_stats view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.v_my_usage_stats AS
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

-- Grant appropriate permissions
GRANT SELECT ON public.v_my_usage_stats TO authenticated;

-- Add RLS policy for v_my_usage_stats (users can only see their own stats)
CREATE POLICY "Users can view own usage stats"
  ON public.v_my_usage_stats
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Recreate v_profiles view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.v_profiles AS
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  u.raw_user_meta_data->>'company' as company,
  u.created_at,
  u.updated_at
FROM auth.users u;

-- Grant appropriate permissions
GRANT SELECT ON public.v_profiles TO authenticated;

-- Add RLS policy for v_profiles (users can only see their own profile)
CREATE POLICY "Users can view own profile"
  ON public.v_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- If the tables referenced by views don't have RLS enabled, enable it
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for api_keys table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_keys'
    AND policyname = 'Users can view own API keys'
  ) THEN
    CREATE POLICY "Users can view own API keys"
      ON public.api_keys
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Add RLS policies for api_logs table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_logs'
    AND policyname = 'Users can view logs for own API keys'
  ) THEN
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
  END IF;
END $$;

-- Comment on the views to explain their purpose
COMMENT ON VIEW public.v_my_usage_stats IS 'User usage statistics view with RLS enabled';
COMMENT ON VIEW public.v_profiles IS 'User profiles view with RLS enabled';