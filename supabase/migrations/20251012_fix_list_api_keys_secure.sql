-- Fix list_api_keys_secure to include key_suffix in return type
-- This resolves "structure of query does not match function result type" error

DROP FUNCTION IF EXISTS private.list_api_keys_secure();

CREATE OR REPLACE FUNCTION private.list_api_keys_secure()
RETURNS TABLE (
  id uuid,
  name text,
  key_prefix text,
  key_suffix text,
  tier text,
  is_active boolean,
  created_at timestamptz,
  last_used_at timestamptz
)
SECURITY DEFINER
SET search_path = public, private
LANGUAGE plpgsql
AS $$
BEGIN
  -- 認証チェック
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ユーザー自身のAPIキーのみを返す
  RETURN QUERY
  SELECT
    ak.id,
    ak.name,
    ak.key_prefix,
    ak.key_suffix,
    ak.tier,
    ak.is_active,
    ak.created_at,
    ak.last_used_at
  FROM private.api_keys ak
  WHERE ak.user_id = auth.uid()
    AND ak.is_active = true
  ORDER BY ak.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION private.list_api_keys_secure() TO authenticated;
