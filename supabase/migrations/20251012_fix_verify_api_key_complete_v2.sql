-- Fix verify_api_key_complete_v2 to use private.api_keys table
-- Migration: 20251012_fix_verify_api_key_complete_v2

DROP FUNCTION IF EXISTS public.verify_api_key_complete_v2(text);

CREATE OR REPLACE FUNCTION public.verify_api_key_complete_v2(p_api_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
    v_key_record RECORD;
    v_is_valid BOOLEAN;
BEGIN
    -- APIキーのフォーマットチェック
    IF p_api_key IS NULL OR NOT p_api_key ~ '^xbrl_v1_[a-z0-9]{32}$' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid API key format'
        );
    END IF;

    -- すべての有効なAPIキーを取得してハッシュと比較（private.api_keysテーブルから）
    FOR v_key_record IN
        SELECT id, user_id, name, key_hash, tier, is_active
        FROM private.api_keys
        WHERE is_active = true
        AND status = 'active'
    LOOP
        -- bcryptでハッシュ比較
        v_is_valid := (crypt(p_api_key, v_key_record.key_hash) = v_key_record.key_hash);

        IF v_is_valid THEN
            -- 最終使用日時を更新
            UPDATE private.api_keys
            SET last_used_at = NOW()
            WHERE id = v_key_record.id;

            -- 検証成功のJSONBオブジェクトを返す
            RETURN jsonb_build_object(
                'valid', true,
                'key_id', v_key_record.id,
                'user_id', v_key_record.user_id,
                'name', v_key_record.name,
                'tier', v_key_record.tier
            );
        END IF;
    END LOOP;

    -- 一致するキーが見つからない場合
    RETURN jsonb_build_object(
        'valid', false,
        'error', 'Invalid or inactive API key'
    );
END;
$function$;

-- 実行権限を付与
GRANT EXECUTE ON FUNCTION public.verify_api_key_complete_v2(text) TO anon, authenticated;

COMMENT ON FUNCTION public.verify_api_key_complete_v2 IS 'APIキーをbcryptハッシュで検証する関数（private.api_keysテーブルを使用）';
