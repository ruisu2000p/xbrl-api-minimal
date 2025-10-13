-- フリーミアムプラン有効期限の実装
-- サインアップから14日間の無料トライアル期間を設定

-- 1. プロフィールテーブルに有効期限カラムを追加
ALTER TABLE private.profiles
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- 2. 既存のフリーミアムユーザー（planが'free'またはNULL）に有効期限を設定
-- created_at + 14日間を有効期限とする
UPDATE private.profiles
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE (plan = 'free' OR plan IS NULL)
  AND trial_ends_at IS NULL;

-- 3. 新規ユーザー作成時に自動的にtrial_ends_atを設定するトリガー関数
CREATE OR REPLACE FUNCTION private.set_trial_period()
RETURNS TRIGGER AS $$
BEGIN
  -- planがfreeまたはNULLの場合、14日間のトライアル期間を設定
  IF (NEW.plan = 'free' OR NEW.plan IS NULL) AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NEW.created_at + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. トリガーを作成（既存のトリガーがあれば削除して再作成）
DROP TRIGGER IF EXISTS set_trial_period_trigger ON private.profiles;
CREATE TRIGGER set_trial_period_trigger
  BEFORE INSERT ON private.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.set_trial_period();

-- 5. 有料プラン（スタンダード）に変更された時にtrial_ends_atをNULLにする関数
CREATE OR REPLACE FUNCTION private.clear_trial_on_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- planがfree以外に変更された場合、trial_ends_atをクリア
  IF NEW.plan != 'free' AND NEW.plan IS NOT NULL AND OLD.plan = 'free' THEN
    NEW.trial_ends_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. アップグレード時のトリガー
DROP TRIGGER IF EXISTS clear_trial_on_upgrade_trigger ON private.profiles;
CREATE TRIGGER clear_trial_on_upgrade_trigger
  BEFORE UPDATE ON private.profiles
  FOR EACH ROW
  WHEN (OLD.plan IS DISTINCT FROM NEW.plan)
  EXECUTE FUNCTION private.clear_trial_on_upgrade();

-- 7. トライアル期限チェック用のRPC関数（API側で使用）
CREATE OR REPLACE FUNCTION public.check_trial_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile RECORD;
  v_result jsonb;
BEGIN
  -- ユーザープロフィールを取得
  SELECT
    plan,
    trial_ends_at,
    created_at,
    CASE
      WHEN plan != 'free' OR plan IS NULL THEN 'active'  -- 有料プランまたはプランなし
      WHEN trial_ends_at IS NULL THEN 'active'  -- トライアル期限が設定されていない
      WHEN trial_ends_at > NOW() THEN 'active'  -- トライアル期間中
      ELSE 'expired'  -- トライアル期限切れ
    END as trial_status,
    CASE
      WHEN trial_ends_at > NOW() THEN EXTRACT(DAY FROM (trial_ends_at - NOW()))
      ELSE 0
    END as days_remaining
  INTO v_profile
  FROM private.profiles
  WHERE id = p_user_id;

  -- ユーザーが見つからない場合
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'User not found',
      'trial_status', 'unknown'
    );
  END IF;

  -- 結果を返す
  RETURN jsonb_build_object(
    'plan', v_profile.plan,
    'trial_status', v_profile.trial_status,
    'trial_ends_at', v_profile.trial_ends_at,
    'days_remaining', v_profile.days_remaining,
    'is_trial_active', v_profile.trial_status = 'active'
  );
END;
$$;

-- 8. 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION public.check_trial_status TO authenticated, service_role;

-- 9. コメント追加
COMMENT ON COLUMN private.profiles.trial_ends_at IS 'フリーミアムプランのトライアル終了日時。有料プランの場合はNULL。';
COMMENT ON FUNCTION public.check_trial_status IS 'ユーザーのトライアル状態をチェックする関数。API側で有効期限を確認するために使用。';
