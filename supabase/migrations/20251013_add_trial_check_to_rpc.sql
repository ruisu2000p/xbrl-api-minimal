-- search_markdowns_secureにトライアル期限チェックを追加

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
  v_trial_ends_at timestamptz;
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

  -- プロフィール情報取得（plan と trial_ends_at）
  SELECT
    COALESCE(p.plan, 'free'),
    p.trial_ends_at
  INTO v_plan, v_trial_ends_at
  FROM private.profiles p
  WHERE p.id = v_user;

  -- ユーザーが見つからない場合
  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = '28000';
  END IF;

  -- フリーミアムプラン（plan='free'）の場合、トライアル期限をチェック
  IF v_plan = 'free' THEN
    -- trial_ends_atがNULLの場合はエラー（本来は設定されているべき）
    IF v_trial_ends_at IS NULL THEN
      RAISE EXCEPTION 'Trial period not configured' USING ERRCODE = '42501';
    END IF;

    -- トライアル期限切れチェック
    IF v_trial_ends_at < NOW() THEN
      RAISE EXCEPTION 'Free trial period has expired. Please upgrade to Standard plan to continue using the API.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- プラン別の年度制限
  IF v_plan = 'free' THEN
    -- Freeプラン: FY2025のみ
    v_allowed_years := ARRAY['FY2025'];
  ELSE
    -- Pro/Enterprise/Standard: 全年度アクセス可能
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

-- コメント追加
COMMENT ON FUNCTION public.search_markdowns_secure IS 'Secure markdown search with API key validation, trial period check, and plan-based fiscal year filtering. Free plan users must be within their 14-day trial period.';
