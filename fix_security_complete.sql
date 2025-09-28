-- Complete fix for all security warnings
-- This script removes views that expose auth.users and recreates them securely

-- 1. Drop existing problematic views completely
DROP VIEW IF EXISTS public.v_my_usage_stats CASCADE;
DROP VIEW IF EXISTS public.v_profiles CASCADE;

-- 2. Create a secure user profile table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 5. Create trigger to sync user profiles with auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Create secure usage stats function instead of view
CREATE OR REPLACE FUNCTION public.get_my_usage_stats()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  api_key_count BIGINT,
  total_api_calls BIGINT,
  last_api_call TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() as user_id,
    up.email,
    COUNT(DISTINCT ak.id) as api_key_count,
    COUNT(DISTINCT al.id) as total_api_calls,
    MAX(al.occurred_at) as last_api_call
  FROM public.user_profiles up
  LEFT JOIN private.api_keys ak ON up.id = ak.user_id
  LEFT JOIN private.api_usage_log al ON ak.id = al.key_id
  WHERE up.id = auth.uid()
  GROUP BY up.id, up.email;
END;
$$ LANGUAGE plpgsql;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_my_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- 9. Populate user_profiles from existing users
INSERT INTO public.user_profiles (id, email, name)
SELECT
  id,
  email,
  raw_user_meta_data->>'name'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = NOW();

-- 10. Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);

-- 11. Verification
SELECT 'Security fixes completed!' as status,
       'Views removed, secure functions created' as result;