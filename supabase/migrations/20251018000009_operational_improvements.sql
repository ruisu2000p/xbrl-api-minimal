-- Operational improvements for monitoring, performance, and permissions
--
-- Purpose: 運用・性能・権限の微調整
-- - NULL を 0 に寄せて監視条件を安定化
-- - インデックス最適化
-- - 監視専用ロールの権限設定
-- - 返金サマリの NULL 除外

-- 1) 失敗率アラート：NULL を 0 に寄せる
CREATE OR REPLACE VIEW public.vw_stripe_webhook_alert_failure_rate AS
SELECT
  COALESCE(MAX(fail_rate_pct), 0.0) AS max_fail_rate_pct,
  CURRENT_DATE AS day
FROM public.vw_stripe_webhook_stats
WHERE day = CURRENT_DATE;

COMMENT ON VIEW public.vw_stripe_webhook_alert_failure_rate IS 'Alert if max_fail_rate_pct > 1.0 (returns 0.0 if no data)';

-- 2) 返金サマリ：NULL を 0 に寄せる
CREATE OR REPLACE VIEW public.vw_daily_refund_summary AS
SELECT
  DATE(ad.deleted_at) AS deletion_date,
  COUNT(*) AS total_deletions,
  COUNT(*) FILTER (WHERE ad.stripe_credit_note_id IS NOT NULL) AS with_refund,
  COALESCE(SUM(ad.stripe_refund_amount), 0) AS total_refund_amount,
  ROUND(COALESCE(AVG(ad.stripe_refund_amount), 0), 2) AS avg_refund_amount
FROM public.account_deletions ad
WHERE ad.deleted_at IS NOT NULL
GROUP BY DATE(ad.deleted_at)
ORDER BY deletion_date DESC;

COMMENT ON VIEW public.vw_daily_refund_summary IS 'Daily summary of account deletions and refunds (NULL-safe)';

-- 3) 汎用インデックス：時系列系の全ビューに効く
CREATE INDEX IF NOT EXISTS idx_stripe_we_created_at
  ON public.stripe_webhook_events (created_at);

COMMENT ON INDEX idx_stripe_we_created_at IS 'General time-series index for all views';

-- 4) 部分インデックス：失敗/未処理フィルタに効く（既存と統合）
DROP INDEX IF EXISTS public.idx_stripe_events_pending;

CREATE INDEX IF NOT EXISTS idx_stripe_we_failed_or_pending
  ON public.stripe_webhook_events (created_at DESC)
  WHERE processed = FALSE OR error IS NOT NULL;

COMMENT ON INDEX idx_stripe_we_failed_or_pending IS 'Partial index for failed/pending event queries';

-- 5) 監視専用ロールの作成と権限付与
DO $$
BEGIN
  -- 監視ロールが存在しない場合のみ作成
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'monitor') THEN
    CREATE ROLE monitor NOLOGIN;
  END IF;
END $$;

-- スキーマ使用権限
GRANT USAGE ON SCHEMA public TO monitor;

-- 監視ビューのみ SELECT 許可（テーブル本体は触らせない）
GRANT SELECT ON
  public.vw_stripe_webhook_alert_pending,
  public.vw_stripe_webhook_alert_failure_rate,
  public.vw_stripe_webhook_health,
  public.vw_stripe_webhook_failures,
  public.vw_stripe_webhook_events_pending,
  public.vw_stripe_webhook_stats,
  public.vw_daily_refund_summary
TO monitor;

COMMENT ON ROLE monitor IS 'Read-only role for monitoring views (no direct table access)';

-- 6) （オプション）通貨別返金サマリ
CREATE OR REPLACE VIEW public.vw_daily_refund_summary_by_currency AS
SELECT
  DATE(ad.deleted_at) AS deletion_date,
  'JPY' AS currency, -- 通貨を追加する場合は適宜調整
  COUNT(*) AS total_deletions,
  COUNT(*) FILTER (WHERE ad.stripe_credit_note_id IS NOT NULL) AS with_refund,
  COALESCE(SUM(ad.stripe_refund_amount), 0) AS total_refund_amount,
  ROUND(COALESCE(AVG(ad.stripe_refund_amount), 0), 2) AS avg_refund_amount
FROM public.account_deletions ad
WHERE ad.deleted_at IS NOT NULL
GROUP BY DATE(ad.deleted_at)
ORDER BY deletion_date DESC;

COMMENT ON VIEW public.vw_daily_refund_summary_by_currency IS 'Daily refund summary with currency breakdown';

-- 監視ビューにも権限付与
GRANT SELECT ON public.vw_daily_refund_summary_by_currency TO monitor;
