-- Fix verify_api_key_bcrypt to accept full API key and verify with bcrypt
-- Migration: 20251012_fix_verify_api_key_bcrypt

DROP FUNCTION IF EXISTS public.verify_api_key_bcrypt(text);

CREATE OR REPLACE FUNCTION public.verify_api_key_bcrypt(p_api_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'extensions', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_key_record RECORD;
  v_is_valid BOOLEAN;
BEGIN
  -- APIキーの形式チェック
  IF p_api_key IS NULL OR p_api_key = '' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'API key is required'
    );
  END IF;

  -- APIキーの形式チェック (xbrl_v1_形式)
  IF NOT p_api_key ~ '^xbrl_v1_[a-z0-9]{32}$' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Invalid API key format'
    );
  END IF;

  -- すべての有効なAPIキーを取得してハッシュと比較
  FOR v_key_record IN
    SELECT id, user_id, key_hash::text, tier, rate_limit_per_minute, request_count, is_active
    FROM private.api_keys
    WHERE is_active = true
    AND (status = 'active' OR status IS NULL)
  LOOP
    -- bcryptでハッシュ比較
    BEGIN
      v_is_valid := (extensions.crypt(p_api_key, v_key_record.key_hash) = v_key_record.key_hash);
    EXCEPTION
      WHEN OTHERS THEN
        -- crypt関数エラーの場合はスキップ
        v_is_valid := false;
    END;

    IF v_is_valid THEN
      -- 最終使用日時とリクエストカウントの更新
      UPDATE private.api_keys
      SET last_used_at = NOW(),
          request_count = COALESCE(request_count, 0) + 1
      WHERE id = v_key_record.id;

      -- 成功
      RETURN jsonb_build_object(
        'valid', true,
        'user_id', v_key_record.user_id,
        'tier', v_key_record.tier,
        'key_id', v_key_record.id,
        'api_key_id', v_key_record.id,
        'rate_limit', COALESCE(v_key_record.rate_limit_per_minute, 100)
      );
    END IF;
  END LOOP;

  -- 一致するキーが見つからない
  RETURN jsonb_build_object(
    'valid', false,
    'message', 'API key not found or inactive'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Error validating API key: ' || SQLERRM
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_api_key_bcrypt(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.verify_api_key_bcrypt IS 'APIキーをbcryptハッシュで検証する関数（完全なAPIキーを受け取る版）';
