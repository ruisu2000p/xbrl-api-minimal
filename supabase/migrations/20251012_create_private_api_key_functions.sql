-- Create private schema if not exists
CREATE SCHEMA IF NOT EXISTS private;

-- Create the private.create_api_key_secure function
CREATE OR REPLACE FUNCTION private.create_api_key_secure(
  key_name text,
  key_hash_input text,
  key_prefix_input text,
  key_suffix_input text DEFAULT NULL,
  tier_input text DEFAULT 'free'
)
RETURNS TABLE(id uuid, name text, key_prefix text, tier text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_key_id uuid;
BEGIN
  -- Get current user ID from auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insert new API key
  INSERT INTO public.api_keys (
    user_id,
    name,
    key_hash,
    key_prefix,
    key_suffix,
    tier,
    is_active
  )
  VALUES (
    v_user_id,
    key_name,
    key_hash_input,
    key_prefix_input,
    key_suffix_input,
    tier_input,
    true
  )
  RETURNING api_keys.id INTO v_key_id;

  -- Return the created key metadata
  RETURN QUERY
  SELECT
    api_keys.id,
    api_keys.name,
    api_keys.key_prefix,
    api_keys.tier,
    api_keys.created_at
  FROM public.api_keys
  WHERE api_keys.id = v_key_id;
END;
$$;

-- Create the private.revoke_api_key_secure function
CREATE OR REPLACE FUNCTION private.revoke_api_key_secure(
  key_id_input uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_deleted boolean := false;
BEGIN
  -- Get current user ID from auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Delete the API key (only if it belongs to the user)
  DELETE FROM public.api_keys
  WHERE id = key_id_input
    AND user_id = v_user_id
  RETURNING true INTO v_deleted;

  RETURN COALESCE(v_deleted, false);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION private.create_api_key_secure TO authenticated;
GRANT EXECUTE ON FUNCTION private.revoke_api_key_secure TO authenticated;
