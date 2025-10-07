-- publicスキーマにRPCラッパー関数を作成
-- Migration: 20251007000008_create_public_rpc_wrappers

-- list_api_keys_secure用のpublicラッパー
CREATE OR REPLACE FUNCTION public.list_api_keys_secure()
RETURNS TABLE (
  id uuid,
  name text,
  key_prefix text,
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
  RETURN QUERY SELECT * FROM private.list_api_keys_secure();
END;
$$;

-- create_api_key_secure用のpublicラッパー
CREATE OR REPLACE FUNCTION public.create_api_key_secure(
  key_name text,
  key_hash_input text,
  key_prefix_input text,
  key_suffix_input text DEFAULT NULL,
  tier_input text DEFAULT 'free'
)
RETURNS TABLE (
  id uuid,
  name text,
  key_prefix text,
  tier text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public, private
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT * FROM private.create_api_key_secure(
    key_name,
    key_hash_input,
    key_prefix_input,
    key_suffix_input,
    tier_input
  );
END;
$$;

-- revoke_api_key_secure用のpublicラッパー
CREATE OR REPLACE FUNCTION public.revoke_api_key_secure(key_id_input uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, private
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN private.revoke_api_key_secure(key_id_input);
END;
$$;

-- verify_api_key_secure用のpublicラッパー
CREATE OR REPLACE FUNCTION public.verify_api_key_secure(api_key_input text)
RETURNS TABLE (
  user_id uuid,
  tier text,
  is_valid boolean
)
SECURITY DEFINER
SET search_path = public, private
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT * FROM private.verify_api_key_secure(api_key_input);
END;
$$;

-- 実行権限を付与
GRANT EXECUTE ON FUNCTION public.list_api_keys_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_api_key_secure(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_api_key_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key_secure(text) TO authenticated, anon;
