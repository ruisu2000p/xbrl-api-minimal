-- Improve error handling for create_api_key_secure to handle one-key-per-user limit

DROP FUNCTION IF EXISTS private.create_api_key_secure(text, text, text, text, text);

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
SET search_path TO 'private', 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_key_id uuid;
  v_existing_key_count int;
BEGIN
  -- Get current user ID from auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user already has an active API key
  SELECT COUNT(*) INTO v_existing_key_count
  FROM private.api_keys
  WHERE user_id = v_user_id
    AND is_active = true;

  IF v_existing_key_count > 0 THEN
    RAISE EXCEPTION 'ALREADY_EXISTS: 既にAPIキーが存在します。新しいキーを作成する前に、既存のキーを削除してください。';
  END IF;

  -- Insert new API key into private.api_keys table
  INSERT INTO private.api_keys (
    user_id,
    name,
    key_hash,
    key_prefix,
    key_suffix,
    tier,
    is_active,
    status
  )
  VALUES (
    v_user_id,
    key_name,
    key_hash_input,
    key_prefix_input,
    key_suffix_input,
    tier_input,
    true,
    'active'
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
  FROM private.api_keys
  WHERE api_keys.id = v_key_id;
END;
$$;

GRANT EXECUTE ON FUNCTION private.create_api_key_secure(text, text, text, text, text) TO authenticated;

-- Also update the public proxy function to pass through the error properly
DROP FUNCTION IF EXISTS public.create_api_key_secure(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_api_key_secure(
  key_name text,
  key_hash_input text,
  key_prefix_input text,
  key_suffix_input text,
  tier_input text
)
RETURNS TABLE (
  id uuid,
  name text,
  tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Call private schema function and return limited fields
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.tier
  FROM private.create_api_key_secure(key_name, key_hash_input, key_prefix_input, key_suffix_input, tier_input) p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_api_key_secure(text, text, text, text, text) TO authenticated;
