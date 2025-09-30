-- APIキー管理テーブル（まだない場合）
CREATE TABLE IF NOT EXISTS private.api_keys_main (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,  -- APIキーのハッシュ値
  key_prefix TEXT NOT NULL,        -- 表示用プレフィックス（xbrl_xxx...）
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- APIキー使用ログテーブル
CREATE TABLE IF NOT EXISTS private.api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES private.api_keys_main(id),
  endpoint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APIキー検証関数（簡易版 - 本番ではハッシュ照合）
CREATE OR REPLACE FUNCTION private.verify_api_key(p_key TEXT)
RETURNS TABLE(api_key_id UUID, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
BEGIN
  -- 簡易版：環境変数のキーと照合
  -- 本番ではここでハッシュ照合を行う
  IF p_key IS NULL OR NOT p_key STARTS WITH 'xbrl_' THEN
    RETURN;
  END IF;

  -- 開発用：固定キーの場合は仮のIDを返す
  IF p_key = 'xbrl_zed68j6eu7_y2y9mneqg4q' THEN
    RETURN QUERY
    SELECT
      '00000000-0000-0000-0000-000000000000'::UUID as api_key_id,
      NULL::UUID as user_id;
  END IF;

  -- 本番：データベースから照合
  -- RETURN QUERY
  -- SELECT k.id, k.user_id
  -- FROM private.api_keys_main k
  -- WHERE k.key_hash = crypt(p_key, k.key_hash)
  --   AND k.is_active = true;
END;
$$;

-- メインのRPC関数：安全な検索
CREATE OR REPLACE FUNCTION public.search_markdowns_secure(
  p_key TEXT,
  p_q TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  company_id TEXT,
  company_name TEXT,
  english_name TEXT,
  fiscal_year TEXT,
  file_type TEXT,
  file_name TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_api_key_id UUID;
  v_user_id UUID;
  v_limit INT;
  v_query TEXT;
BEGIN
  -- APIキー検証
  SELECT api_key_id, user_id INTO v_api_key_id, v_user_id
  FROM private.verify_api_key(p_key);

  IF v_api_key_id IS NULL THEN
    RAISE EXCEPTION 'Invalid API key' USING ERRCODE = '28000';
  END IF;

  -- 入力検証
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
  v_query := TRIM(COALESCE(p_q, ''));

  IF LENGTH(v_query) > 64 THEN
    RAISE EXCEPTION 'Query too long (max 64 chars)' USING ERRCODE = '22001';
  END IF;

  -- 使用ログ記録（非同期にしたい場合は別途検討）
  INSERT INTO private.api_key_usage_logs (api_key_id, endpoint, ip_address)
  VALUES (v_api_key_id, 'search_markdowns_secure', current_setting('request.headers', true)::json->>'cf-connecting-ip');

  -- 検索実行
  RETURN QUERY
  SELECT
    m.id,
    m.company_id,
    m.company_name,
    m.english_name,
    m.fiscal_year,
    m.file_type,
    m.file_name,
    m.storage_path,
    m.created_at,
    m.updated_at
  FROM private.markdown_files_metadata m
  WHERE
    v_query = '' OR
    m.company_name ILIKE '%' || v_query || '%' OR
    m.english_name ILIKE '%' || v_query || '%'
  ORDER BY m.created_at DESC
  LIMIT v_limit;
END;
$$;

-- 権限設定
REVOKE ALL ON FUNCTION public.search_markdowns_secure(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_markdowns_secure(TEXT, TEXT, INT) TO service_role;

-- コメント
COMMENT ON FUNCTION public.search_markdowns_secure IS 'Secure RPC function for searching markdown files with API key validation';