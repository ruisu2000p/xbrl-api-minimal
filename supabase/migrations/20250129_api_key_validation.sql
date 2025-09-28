-- =====================================================
-- APIキー検証用のRPC関数
-- =====================================================

-- APIキーを検証する関数
CREATE OR REPLACE FUNCTION public.verify_api_key_hash(p_api_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, extensions
AS $$
DECLARE
  v_key_prefix text;
  v_key_record record;
  v_is_valid boolean;
BEGIN
  -- APIキーのプレフィックスを抽出
  v_key_prefix := substring(p_api_key, 1, 12);

  -- プレフィックスでキーを検索
  SELECT *
  INTO v_key_record
  FROM private.api_keys_main
  WHERE key_prefix = v_key_prefix
    AND is_active = true
    AND status = 'active'
  LIMIT 1;

  -- キーが見つからない場合
  IF v_key_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid API key'
    );
  END IF;

  -- bcryptでハッシュを検証
  v_is_valid := (v_key_record.key_hash = crypt(p_api_key, v_key_record.key_hash));

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid API key'
    );
  END IF;

  -- 最終使用日時を更新
  UPDATE private.api_keys_main
  SET last_used_at = NOW(),
      total_requests = COALESCE(total_requests, 0) + 1,
      successful_requests = COALESCE(successful_requests, 0) + 1
  WHERE id = v_key_record.id;

  -- 成功レスポンス（ユーザー情報を含む）
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'user_id', v_key_record.user_id,
      'key_id', v_key_record.id,
      'tier', v_key_record.tier,
      'environment', v_key_record.environment
    )
  );
END;
$$;

-- 権限設定（anonでもAPIキー検証は可能にする）
GRANT EXECUTE ON FUNCTION public.verify_api_key_hash TO anon, authenticated;

COMMENT ON FUNCTION public.verify_api_key_hash IS 'APIキーを検証して関連情報を返す';