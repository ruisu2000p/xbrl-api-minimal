-- Fix resolve_user_by_api_key to return a valid user_id for dev key
-- Current issue: Returns NULL user_id which may cause issues

CREATE OR REPLACE FUNCTION private.resolve_user_by_api_key(p_key text)
RETURNS TABLE(api_key_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'private', 'public'
AS $$
  DECLARE
    v jsonb;
    has_bcrypt_func boolean;
  BEGIN
    -- verify_api_key_bcrypt関数の存在確認
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'verify_api_key_bcrypt'
    ) INTO has_bcrypt_func;

    IF has_bcrypt_func THEN
      -- bcrypt検証関数が存在する場合
      SELECT to_jsonb(d) INTO v
        FROM verify_api_key_bcrypt(p_key) d;

      IF coalesce((v->>'valid')::boolean, false) IS TRUE THEN
        RETURN QUERY
          SELECT (v->>'key_id')::UUID, (v->>'user_id')::UUID;
        RETURN;
      END IF;
    END IF;

    -- フォールバック：簡易検証
    IF p_key IS NULL OR NOT p_key LIKE 'xbrl_%' THEN
      RETURN;
    END IF;

    -- 開発用：固定キーの場合は仮のIDを返す（user_idも有効なUUIDに変更）
    IF p_key = 'xbrl_zed68j6eu7_y2y9mneqg4q' THEN
      RETURN QUERY
      SELECT
        '00000000-0000-0000-0000-000000000001'::UUID as api_key_id,
        '00000000-0000-0000-0000-000000000002'::UUID as user_id;
    END IF;
  END $$;

-- Test the function
SELECT * FROM private.resolve_user_by_api_key('xbrl_zed68j6eu7_y2y9mneqg4q');