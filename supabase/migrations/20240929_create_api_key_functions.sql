-- APIキー取得用のRPC関数
CREATE OR REPLACE FUNCTION public.get_user_api_keys(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  key_prefix TEXT,
  tier TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    akm.id,
    akm.name,
    akm.key_prefix,
    akm.tier,
    akm.is_active,
    akm.created_at,
    akm.last_used_at
  FROM private.api_keys_main akm
  WHERE akm.user_id = p_user_id
    AND akm.is_active = true
  ORDER BY akm.created_at DESC;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION public.get_user_api_keys(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_api_keys(UUID) TO service_role;