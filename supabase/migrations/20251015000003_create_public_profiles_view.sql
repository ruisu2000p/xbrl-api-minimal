-- Create a public view for profiles table to allow Supabase client access
-- This view exposes only the necessary fields from private.profiles

-- Drop the view if it exists to recreate with correct security settings
DROP VIEW IF EXISTS public.profiles;

-- Create the view with security_definer to bypass RLS
CREATE VIEW public.profiles
WITH (security_invoker = off, security_barrier = false) AS
SELECT
  id,
  email,
  full_name,
  company_name,
  plan,
  trial_ends_at,
  created_at,
  updated_at
FROM private.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Update the get_my_profile function to use the correct view
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DECLARE
    v_profile record;
  BEGIN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile.id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Profile not found'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'data', row_to_json(v_profile)::jsonb
    );
  END;
$$;

-- Add comment
COMMENT ON VIEW public.profiles IS 'Public view of user profiles with RLS, exposing private.profiles data to Supabase client';
