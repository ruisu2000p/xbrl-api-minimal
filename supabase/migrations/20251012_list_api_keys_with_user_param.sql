-- Modify list_api_keys_secure to accept user_id parameter explicitly
-- This resolves auth.uid() context issues in Edge Function environment

DROP FUNCTION IF EXISTS private.list_api_keys_secure();

CREATE OR REPLACE FUNCTION private.list_api_keys_secure(p_user_id uuid DEFAULT NULL)
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
DECLARE
  v_user_id uuid;
BEGIN
  -- Use provided user_id parameter, fallback to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- 認証チェック
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no user_id provided and auth.uid() is null';
  END IF;

  -- ユーザー自身のAPIキーのみを返す
  RETURN QUERY
  SELECT
    ak.id,
    ak.name::text,
    ak.key_prefix::text,
    ak.key_suffix::text,
    ak.tier::text,
    ak.is_active,
    ak.created_at,
    ak.last_used_at
  FROM private.api_keys ak
  WHERE ak.user_id = v_user_id
    AND ak.is_active = true
  ORDER BY ak.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION private.list_api_keys_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.list_api_keys_secure(uuid) TO anon;
