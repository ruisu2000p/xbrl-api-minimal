-- Create validate_api_key_secure and update verify_api_key_secure
-- Migration: 20251012_create_validate_api_key_secure

-- 1. Create validate_api_key_secure as an alias to verify_api_key_complete_v2
--    This function returns key_id and user_id for backward compatibility
DROP FUNCTION IF EXISTS public.validate_api_key_secure(text);

CREATE OR REPLACE FUNCTION public.validate_api_key_secure(p_key text)
RETURNS TABLE(
  key_id uuid,
  user_id uuid,
  tier text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Call verify_api_key_complete_v2
  v_result := public.verify_api_key_complete_v2(p_key);

  -- Check if valid
  IF (v_result->>'valid')::boolean = true THEN
    RETURN QUERY SELECT
      (v_result->>'key_id')::uuid AS key_id,
      (v_result->>'user_id')::uuid AS user_id,
      (v_result->>'tier')::text AS tier,
      true AS is_valid;
  ELSE
    -- Return NULL row for invalid key
    RETURN QUERY SELECT
      NULL::uuid AS key_id,
      NULL::uuid AS user_id,
      NULL::text AS tier,
      false AS is_valid;
  END IF;
END;
$function$;

-- 2. Update verify_api_key_secure to also return key_id
DROP FUNCTION IF EXISTS public.verify_api_key_secure(text);

CREATE OR REPLACE FUNCTION public.verify_api_key_secure(api_key_input text)
RETURNS TABLE(
  key_id uuid,
  user_id uuid,
  tier text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Call verify_api_key_complete_v2
  v_result := public.verify_api_key_complete_v2(api_key_input);

  -- Check if valid
  IF (v_result->>'valid')::boolean = true THEN
    RETURN QUERY SELECT
      (v_result->>'key_id')::uuid AS key_id,
      (v_result->>'user_id')::uuid AS user_id,
      (v_result->>'tier')::text AS tier,
      true AS is_valid;
  ELSE
    -- Return NULL row for invalid key
    RETURN QUERY SELECT
      NULL::uuid AS key_id,
      NULL::uuid AS user_id,
      NULL::text AS tier,
      false AS is_valid;
  END IF;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_api_key_secure(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key_secure(text) TO anon, authenticated;

COMMENT ON FUNCTION public.validate_api_key_secure IS 'APIキーを検証してkey_id, user_id, tier, is_validを返す（verify_api_key_complete_v2のラッパー）';
COMMENT ON FUNCTION public.verify_api_key_secure IS 'APIキーを検証してkey_id, user_id, tier, is_validを返す（verify_api_key_complete_v2のラッパー）';
