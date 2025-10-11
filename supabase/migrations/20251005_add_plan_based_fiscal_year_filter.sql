-- プラン別の年度アクセス制限を実装
-- Free: FY2025のみ
-- Pro/Enterprise: 全年度

CREATE OR REPLACE FUNCTION public.search_markdowns_secure(
  p_key text,
  p_q text DEFAULT NULL,
  p_fiscal_year text DEFAULT NULL,
  p_company_id text DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  company_id text,
  company_name text,
  english_name text,
  file_name text,
  file_type text,
  storage_path text,
  fiscal_year text,
  file_size bigint,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  v_user UUID;
  v_key UUID;
  v_plan TEXT;
  v_q TEXT := coalesce(p_q, '');
  v_lim INT := greatest(1, least(coalesce(p_limit, 10), 50));
  v_off INT := greatest(0, least(coalesce(p_offset, 0), 100000));
  v_allowed_years TEXT[];
BEGIN
  -- APIキー検証
  SELECT key_id, user_id INTO v_key, v_user
    FROM public.verify_api_key_secure(p_key);

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Invalid API key' USING ERRCODE = '28000';
  END IF;

  -- プラン情報取得（user_id経由でsubscriptionsテーブルから）
  SELECT COALESCE(s.plan_type, 'free') INTO v_plan
  FROM private.subscriptions s
  WHERE s.user_id = v_user
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY s.expires_at DESC NULLS LAST
  LIMIT 1;

  -- プランが見つからない場合はfreeとして扱う
  v_plan := COALESCE(v_plan, 'free');

  -- プラン別の年度制限
  IF v_plan = 'free' THEN
    -- Freeプラン: FY2025のみ
    v_allowed_years := ARRAY['FY2025'];
  ELSE
    -- Pro/Enterprise: 全年度アクセス可能
    v_allowed_years := NULL; -- NULLは制限なし
  END IF;

  -- 入力検証
  IF length(v_q) > 64 THEN
    RAISE EXCEPTION 'Query too long (max 64 chars)' USING ERRCODE = '22001';
  END IF;
  IF p_fiscal_year IS NOT NULL AND length(p_fiscal_year) > 16 THEN
    RAISE EXCEPTION 'Fiscal year too long (max 16 chars)' USING ERRCODE = '22001';
  END IF;
  IF p_company_id IS NOT NULL AND length(p_company_id) > 64 THEN
    RAISE EXCEPTION 'Company ID too long (max 64 chars)' USING ERRCODE = '22001';
  END IF;

  -- 検索実行
  RETURN QUERY
    SELECT
      m.id,
      m.company_id,
      m.company_name,
      m.english_name,
      m.file_name,
      m.file_type,
      m.storage_path,
      m.fiscal_year,
      m.file_size,
      m.created_at,
      m.updated_at
    FROM private.markdown_files_metadata m
    WHERE
      (p_company_id IS NULL OR m.company_id = p_company_id)
      AND (p_fiscal_year IS NULL OR m.fiscal_year = p_fiscal_year)
      -- プラン別年度フィルタ
      AND (v_allowed_years IS NULL OR m.fiscal_year = ANY(v_allowed_years))
      AND (
        v_q = '' OR
        norm(m.company_name) LIKE '%' || norm(v_q) || '%' OR
        norm(m.english_name) LIKE '%' || norm(v_q) || '%' OR
        norm(m.file_name) LIKE '%' || norm(v_q) || '%'
      )
    ORDER BY m.created_at DESC
    LIMIT v_lim OFFSET v_off;
END;
$$;
