-- トライアル関連関数のsearch_pathセキュリティ修正

-- 1. set_trial_period関数にsearch_pathを設定
CREATE OR REPLACE FUNCTION private.set_trial_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- planがfreeまたはNULLの場合、14日間のトライアル期間を設定
  IF (NEW.plan = 'free' OR NEW.plan IS NULL) AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NEW.created_at + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. clear_trial_on_upgrade関数にsearch_pathを設定
CREATE OR REPLACE FUNCTION private.clear_trial_on_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- planがfree以外に変更された場合、trial_ends_atをクリア
  IF NEW.plan != 'free' AND NEW.plan IS NOT NULL AND OLD.plan = 'free' THEN
    NEW.trial_ends_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- コメント追加
COMMENT ON FUNCTION private.set_trial_period IS 'Sets trial period for new free plan users. Secure with immutable search_path.';
COMMENT ON FUNCTION private.clear_trial_on_upgrade IS 'Clears trial period when upgrading from free plan. Secure with immutable search_path.';
