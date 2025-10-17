-- 退会システムのデータベーススキーマ作成
--
-- このマイグレーションは以下を実装します：
-- 1. account_deletions テーブル（退会記録、30日猶予期間対応）
-- 2. user_subscriptions への cancelled_at カラム追加
-- 3. api_keys への revoked/revoked_at カラム追加
-- 4. べき等性保証のための idempotency_key
-- 5. GDPR 対応のための email_hash（最小 PII）

-- =====================================================
-- 1. account_deletions テーブル（退会記録）
-- =====================================================

CREATE TABLE IF NOT EXISTS account_deletions (
  id BIGSERIAL PRIMARY KEY,

  -- ユーザー識別（物理削除後は NULL になる）
  user_id UUID,  -- FK なし（記録保持のため）
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,  -- SHA-256 ハッシュ（匿名化用）

  -- べき等性保証
  idempotency_key TEXT UNIQUE NOT NULL,

  -- 退会理由（Stripe cancellation_details にも同期）
  reason TEXT,  -- 'too_expensive', 'missing_features', 'low_usage', 'other'
  comment TEXT, -- 自由記述

  -- タイムスタンプ
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  permanent_deletion_at TIMESTAMPTZ NOT NULL,  -- 30日後の物理削除予定日
  purge_done_at TIMESTAMPTZ,                   -- 物理削除完了日時
  restored_at TIMESTAMPTZ,                     -- 復元された場合の日時

  -- GDPR データポータビリティ対応
  data_portability_done_at TIMESTAMPTZ,        -- エクスポート提供完了日時

  -- メタデータ
  subscription_id TEXT,       -- Stripe subscription ID（参照用）
  stripe_customer_id TEXT,    -- Stripe customer ID（参照用）
  plan_at_deletion TEXT,      -- 削除時のプラン（分析用）

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_account_deletions_user_id
  ON account_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletions_permanent_deletion_at
  ON account_deletions(permanent_deletion_at)
  WHERE purge_done_at IS NULL;  -- 未削除のみ
CREATE INDEX IF NOT EXISTS idx_account_deletions_email_hash
  ON account_deletions(email_hash);

-- RLS 有効化（Service Role のみアクセス可能）
ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_only ON account_deletions;
CREATE POLICY service_role_only ON account_deletions
  FOR ALL
  USING (auth.role() = 'service_role');

-- コメント
COMMENT ON TABLE account_deletions IS '退会記録テーブル - 30日猶予期間と GDPR 対応';
COMMENT ON COLUMN account_deletions.user_id IS 'ユーザーID（物理削除後は NULL、FK なし）';
COMMENT ON COLUMN account_deletions.email_hash IS 'メールアドレスの SHA-256 ハッシュ（最小 PII）';
COMMENT ON COLUMN account_deletions.idempotency_key IS 'べき等性保証のためのキー（重複防止）';
COMMENT ON COLUMN account_deletions.permanent_deletion_at IS '物理削除予定日（削除日 + 30日）';
COMMENT ON COLUMN account_deletions.data_portability_done_at IS 'データエクスポート提供完了日時（GDPR Art.20）';

-- =====================================================
-- 2. user_subscriptions テーブルへの拡張
-- =====================================================

-- cancelled_at カラム追加（退会日時）
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_cancelled_at
  ON user_subscriptions(cancelled_at)
  WHERE cancelled_at IS NOT NULL;

COMMENT ON COLUMN user_subscriptions.cancelled_at IS '退会日時（サブスクリプションキャンセル）';

-- =====================================================
-- 3. api_keys テーブルへの拡張
-- =====================================================

-- revoked/revoked_at カラム追加
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked
  ON api_keys(revoked)
  WHERE revoked = TRUE;

COMMENT ON COLUMN api_keys.revoked IS 'API キー無効化フラグ（退会時に TRUE）';
COMMENT ON COLUMN api_keys.revoked_at IS 'API キー無効化日時';

-- =====================================================
-- 4. 退会記録保持期間の自動削除関数（オプション）
-- =====================================================

-- 13ヶ月以上前の退会記録を削除（会計・税務保持期間を考慮）
CREATE OR REPLACE FUNCTION cleanup_old_account_deletions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM account_deletions
  WHERE deleted_at < NOW() - INTERVAL '13 months'
    AND purge_done_at IS NOT NULL;  -- 物理削除済みのみ

  RAISE NOTICE 'Deleted old account deletion records older than 13 months';
END;
$$;

COMMENT ON FUNCTION cleanup_old_account_deletions IS '13ヶ月以上前の退会記録を削除（会計・税務保持期間）';

-- =====================================================
-- 5. べき等性チェック用ヘルパー関数
-- =====================================================

CREATE OR REPLACE FUNCTION check_deletion_idempotency(
  p_idempotency_key TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  already_processed BOOLEAN,
  deletion_id BIGINT,
  deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as already_processed,
    id as deletion_id,
    account_deletions.deleted_at
  FROM account_deletions
  WHERE idempotency_key = p_idempotency_key
    AND user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

COMMENT ON FUNCTION check_deletion_idempotency IS 'べき等性チェック - 同一キーでの重複処理を防止';

-- =====================================================
-- 6. 猶予期間中のユーザー判定関数
-- =====================================================

CREATE OR REPLACE FUNCTION is_user_pending_deletion(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1
    FROM account_deletions
    WHERE user_id = p_user_id
      AND purge_done_at IS NULL      -- 未削除
      AND restored_at IS NULL         -- 未復元
      AND permanent_deletion_at > NOW()  -- まだ猶予期間内
  );
END;
$$;

COMMENT ON FUNCTION is_user_pending_deletion IS '猶予期間中（削除予定）のユーザーか判定';

-- =====================================================
-- 7. 監査ログイベント型の拡張
-- =====================================================

-- 既存の audit_logs テーブルにコメント追加（将来の参照用）
COMMENT ON TABLE audit_logs IS 'セキュリティ監査ログ - account_deletion/account_restoration イベントも記録';
