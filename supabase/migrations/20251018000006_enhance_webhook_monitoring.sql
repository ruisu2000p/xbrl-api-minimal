-- Enhanced monitoring views and operational indexes for Stripe Webhooks
--
-- Purpose: 本番運用の監視・自己修復インフラ
-- - 未処理/失敗イベントの可視化
-- - 日次サマリと失敗率の追跡
-- - 効率的なクエリのための部分インデックス
-- - 古いイベントの自動削除（90日保持）

-- 1) 未処理/失敗イベント一覧（強化版）
CREATE OR REPLACE VIEW public.vw_stripe_webhook_events_pending AS
SELECT
  event_id,
  type,
  created_at,
  processed,
  processed_at,
  error
FROM public.stripe_webhook_events
WHERE processed = FALSE OR error IS NOT NULL
ORDER BY created_at DESC;

COMMENT ON VIEW public.vw_stripe_webhook_events_pending IS 'Pending or failed Stripe Webhook events for monitoring (enhanced)';

-- 2) 日次・タイプ別サマリ（件数/失敗率）
CREATE OR REPLACE VIEW public.vw_stripe_webhook_stats AS
WITH base AS (
  SELECT
    DATE_TRUNC('day', created_at) AS day,
    type,
    COUNT(*)                      AS total,
    COUNT(*) FILTER (WHERE processed = TRUE AND error IS NULL) AS succeeded,
    COUNT(*) FILTER (WHERE processed = FALSE OR error IS NOT NULL) AS failed
  FROM public.stripe_webhook_events
  GROUP BY 1, 2
)
SELECT
  day::DATE,
  type,
  total,
  succeeded,
  failed,
  ROUND(100.0 * failed / NULLIF(total, 0), 2) AS fail_rate_pct
FROM base
ORDER BY day DESC, type;

COMMENT ON VIEW public.vw_stripe_webhook_stats IS 'Daily statistics of Stripe Webhook events by type with failure rate';

-- 3) 推奨インデックス："未処理/失敗だけ"を見るときに効く部分インデックス
CREATE INDEX IF NOT EXISTS idx_stripe_events_pending
  ON public.stripe_webhook_events (created_at DESC)
  WHERE processed = FALSE OR error IS NOT NULL;

COMMENT ON INDEX idx_stripe_events_pending IS 'Partial index for efficient pending/failed event queries';

-- 4) 古いイベントの自動削除（90日保持の例）
-- Note: pg_cron extension が有効な場合のみ実行
-- Supabase では managed cron jobs を使用することを推奨

-- 手動実行用のクリーンアップ関数
CREATE OR REPLACE FUNCTION public.purge_old_stripe_webhook_events(
  retention_days INT DEFAULT 90
)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  result BIGINT;
BEGIN
  DELETE FROM public.stripe_webhook_events
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS result = ROW_COUNT;
  RETURN QUERY SELECT result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.purge_old_stripe_webhook_events IS 'Purge Stripe webhook events older than specified days (default: 90)';
