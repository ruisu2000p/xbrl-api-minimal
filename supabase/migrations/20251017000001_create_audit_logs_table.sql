-- セキュリティ監査ログテーブルの作成
--
-- このテーブルは以下のセキュリティイベントを記録します：
-- - ログイン成功/失敗
-- - ログアウト
-- - Cookie重複検知
-- - レート制限超過
-- - CSRF検証失敗
-- - パスワードリセット
-- - セッションタイムアウト
--
-- プライバシー保護:
-- - IP アドレスは /24 ネットマスクでマスク後、SHA-256 でハッシュ化
-- - User-Agent は 64 文字に切り詰め
-- - ログは 90 日後に自動削除（pg_cron 使用）

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  outcome TEXT CHECK (outcome IN ('success', 'fail') OR outcome IS NULL),
  user_email TEXT,
  ip_hash TEXT,
  user_agent_short TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス（クエリパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON audit_logs(outcome);

-- Row Level Security (RLS) を有効化
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Service Role のみがアクセス可能（一般ユーザーは読み書き不可）
-- Note: 'service_role' は Supabase の認証ロール名です（シークレットキーではありません）
DROP POLICY IF EXISTS admin_access_only ON audit_logs;
CREATE POLICY admin_access_only ON audit_logs
  FOR ALL
  USING (
    -- service_role または supabase_admin のみアクセス可能
    auth.role() = 'service_role' OR
    auth.role() = 'supabase_admin'
  );

-- コメントを追加
COMMENT ON TABLE audit_logs IS 'セキュリティ監査ログ - Service Role のみアクセス可能';
COMMENT ON COLUMN audit_logs.event_type IS 'イベント種別: login, logout, cookie_conflict, rate_limit, csrf_failure, password_reset, session_timeout';
COMMENT ON COLUMN audit_logs.outcome IS 'イベント結果: success または fail';
COMMENT ON COLUMN audit_logs.user_email IS 'ユーザーメールアドレス（存在する場合）';
COMMENT ON COLUMN audit_logs.ip_hash IS 'IP アドレスのハッシュ値（/24 マスク + SHA-256）';
COMMENT ON COLUMN audit_logs.user_agent_short IS 'User-Agent 文字列（64文字まで）';
COMMENT ON COLUMN audit_logs.details IS '追加情報（JSONB形式）';

-- 90日以上前のログを自動削除する関数を作成
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Deleted old audit logs older than 90 days';
END;
$$;

-- 定期実行のための手動削除クエリ（pg_cron が利用できない場合）
-- 以下のクエリを定期的に実行してください：
-- SELECT cleanup_old_audit_logs();
--
-- または pg_cron 拡張が有効な場合（Supabase Pro 以上）:
-- SELECT cron.schedule(
--   'cleanup-audit-logs',
--   '0 0 * * 0',  -- 毎週日曜日 0:00 に実行
--   $$SELECT cleanup_old_audit_logs()$$
-- );
