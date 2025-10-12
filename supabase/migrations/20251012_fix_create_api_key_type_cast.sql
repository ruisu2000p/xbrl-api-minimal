-- Fix type casting in create_api_key_secure return values

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

  -- Return the created key metadata with explicit type casting
  RETURN QUERY
  SELECT
    ak.id,
    ak.name::text,
    ak.key_prefix::text,
    ak.tier::text,
    ak.created_at
  FROM private.api_keys ak
  WHERE ak.id = v_key_id;
END;
$$;

GRANT EXECUTE ON FUNCTION private.create_api_key_secure(text, text, text, text, text) TO authenticated;
