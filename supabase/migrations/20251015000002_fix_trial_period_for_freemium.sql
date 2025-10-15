-- Fix trial period trigger to work with 'freemium' plan
-- This migration fixes the plan naming inconsistency where the trigger
-- was checking for 'free' but the actual plan is 'freemium'

-- Update the set_trial_period function to check for 'freemium' instead of 'free'
CREATE OR REPLACE FUNCTION private.set_trial_period()
RETURNS TRIGGER AS $$
BEGIN
  -- planがfreemiumまたはNULLの場合、14日間のトライアル期間を設定
  IF (NEW.plan = 'freemium' OR NEW.plan IS NULL) AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NEW.created_at + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the clear_trial_on_upgrade function to check for 'freemium' instead of 'free'
CREATE OR REPLACE FUNCTION private.clear_trial_on_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- planがfreeからstandardに変更された場合、トライアル期限をクリア
  IF OLD.plan = 'freemium' AND NEW.plan = 'standard' THEN
    NEW.trial_ends_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the search_markdowns_secure RPC function to check for 'freemium' instead of 'free'
CREATE OR REPLACE FUNCTION public.search_markdowns_secure(
  search_query text,
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  content text,
  storage_path text,
  similarity float,
  created_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
  v_plan text;
  v_trial_ends_at timestamptz;
BEGIN
  -- 認証済みユーザーのIDを取得
  v_user_id := auth.uid();

  -- ユーザーが認証されていない場合はエラー
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- ユーザーのプランとトライアル期限を取得
  SELECT u.plan, u.trial_ends_at
  INTO v_plan, v_trial_ends_at
  FROM private.profiles u
  WHERE u.id = v_user_id;

  -- プラン情報が見つからない場合はエラー
  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'User plan not found'
      USING ERRCODE = '42501';
  END IF;

  -- フリーミアムプラン（plan='freemium'）の場合、トライアル期限をチェック
  IF v_plan = 'freemium' THEN
    IF v_trial_ends_at < NOW() THEN
      RAISE EXCEPTION 'Free trial period has expired. Please upgrade to Standard plan to continue using the API.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- standardプランの場合は制限なし、freemiumの場合は直近1年間のデータのみ
  RETURN QUERY
  SELECT
    m.content,
    m.storage_path,
    (1 - (m.embedding <=> ai.openai_embed('text-embedding-3-small', search_query)::vector)) AS similarity,
    m.created_at
  FROM vector_store m
  WHERE
    (1 - (m.embedding <=> ai.openai_embed('text-embedding-3-small', search_query)::vector)) > similarity_threshold
    AND (
      v_plan = 'standard'
      OR (v_plan = 'freemium' AND m.created_at >= NOW() - INTERVAL '1 year')
    )
  ORDER BY m.embedding <=> ai.openai_embed('text-embedding-3-small', search_query)::vector
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill trial_ends_at for existing freemium users who don't have it set
UPDATE private.profiles
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE plan = 'freemium'
  AND trial_ends_at IS NULL
  AND created_at IS NOT NULL;

-- Add comment to document the fix
COMMENT ON FUNCTION private.set_trial_period() IS 'Automatically sets 14-day trial period for freemium users. Fixed to check for freemium plan instead of free plan.';
COMMENT ON FUNCTION public.search_markdowns_secure(text, float, int) IS 'Secure search function that checks user plan and trial status. Fixed to check for freemium plan instead of free plan.';
