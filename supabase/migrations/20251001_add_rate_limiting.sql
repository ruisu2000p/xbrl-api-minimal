-- レート制限機能の実装
-- APIキー単位でリクエスト回数を制限する

-- レート制限チェック関数
CREATE OR REPLACE FUNCTION private.check_rate_limit(
  p_api_key_id UUID,
  p_limit_per_minute INTEGER DEFAULT 60,
  p_limit_per_hour INTEGER DEFAULT 1000,
  p_limit_per_day INTEGER DEFAULT 10000
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
DECLARE
  v_minute_count INTEGER;
  v_hour_count INTEGER;
  v_day_count INTEGER;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- 過去1分間のリクエスト数をカウント
  SELECT COUNT(*)
  INTO v_minute_count
  FROM private.api_key_usage_logs_main
  WHERE api_key_id = p_api_key_id
    AND created_at >= v_now - INTERVAL '1 minute';

  -- 制限超過チェック（分）
  IF v_minute_count >= p_limit_per_minute THEN
    RETURN FALSE;
  END IF;

  -- 過去1時間のリクエスト数をカウント
  SELECT COUNT(*)
  INTO v_hour_count
  FROM private.api_key_usage_logs_main
  WHERE api_key_id = p_api_key_id
    AND created_at >= v_now - INTERVAL '1 hour';

  -- 制限超過チェック（時間）
  IF v_hour_count >= p_limit_per_hour THEN
    RETURN FALSE;
  END IF;

  -- 過去24時間のリクエスト数をカウント
  SELECT COUNT(*)
  INTO v_day_count
  FROM private.api_key_usage_logs_main
  WHERE api_key_id = p_api_key_id
    AND created_at >= v_now - INTERVAL '1 day';

  -- 制限超過チェック（日）
  IF v_day_count >= p_limit_per_day THEN
    RETURN FALSE;
  END IF;

  -- すべての制限内
  RETURN TRUE;
END;
$$;

-- 使用ログ記録関数の改善
CREATE OR REPLACE FUNCTION private.log_api_usage(
  p_api_key_id UUID,
  p_endpoint TEXT,
  p_method TEXT DEFAULT 'GET',
  p_response_status INTEGER DEFAULT 200
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
BEGIN
  -- 使用ログを記録
  INSERT INTO private.api_key_usage_logs_main (
    api_key_id,
    endpoint,
    method,
    response_status,
    created_at
  )
  VALUES (
    p_api_key_id,
    p_endpoint,
    p_method,
    p_response_status,
    NOW()
  );

  -- api_keys_mainテーブルのlast_used_atを更新
  UPDATE private.api_keys_main
  SET last_used_at = NOW(),
      request_count = COALESCE(request_count, 0) + 1
  WHERE id = p_api_key_id;
END;
$$;

-- 古いログを削除する関数（保守用）
CREATE OR REPLACE FUNCTION private.cleanup_old_usage_logs(
  p_retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 保持期間を超えた古いログを削除
  DELETE FROM private.api_key_usage_logs_main
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION private.check_rate_limit(UUID, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION private.log_api_usage(UUID, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION private.cleanup_old_usage_logs(INTEGER) TO service_role;

-- コメント
COMMENT ON FUNCTION private.check_rate_limit IS 'APIキーのレート制限をチェックする関数（分/時間/日単位）';
COMMENT ON FUNCTION private.log_api_usage IS 'API使用ログを記録し、last_used_atを更新する関数';
COMMENT ON FUNCTION private.cleanup_old_usage_logs IS '古いAPI使用ログを削除する保守関数';
