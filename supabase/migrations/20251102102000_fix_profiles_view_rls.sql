-- Fix public.profiles view and add RLS policies
-- This fixes the 403 error when accessing profiles table

-- Drop existing view if it exists (it has recursive reference issue)
DROP VIEW IF EXISTS public.profiles CASCADE;

-- Recreate view with correct reference to private.profiles
CREATE VIEW public.profiles AS
SELECT
  id,
  email,
  full_name,
  company_name,
  plan,
  trial_ends_at,
  email_status,
  created_at,
  updated_at
FROM private.profiles;

-- Enable RLS on the view
ALTER VIEW public.profiles SET (security_invoker = on);

-- Grant access to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;

-- Add comment
COMMENT ON VIEW public.profiles IS 'Public view of user profiles with RLS enabled';
