-- Operational alert queries and health check views
--
-- Purpose: 運用ガードレール
-- - 未処理/失敗イベントのアラート
-- - 失敗率の監視
-- - ヘルスチェック用のビュー

-- 1) アラート用：直近15分の未処理/失敗イベント数
CREATE OR REPLACE VIEW public.vw_stripe_webhook_alert_pending AS
SELECT
  COUNT(*) AS pending_count,
  NOW() - INTERVAL '15 minutes' AS window_start,
  NOW() AS window_end
FROM public.stripe_webhook_events
WHERE
  (processed = FALSE OR error IS NOT NULL)
  AND created_at > NOW() - INTERVAL '15 minutes';

COMMENT ON VIEW public.vw_stripe_webhook_alert_pending IS 'Alert if pending_count > 0 in last 15 minutes';

-- 2) アラート用：今日の最大失敗率
CREATE OR REPLACE VIEW public.vw_stripe_webhook_alert_failure_rate AS
SELECT
  MAX(fail_rate_pct) AS max_fail_rate_pct,
  CURRENT_DATE AS day
FROM public.vw_stripe_webhook_stats
WHERE day = CURRENT_DATE;

COMMENT ON VIEW public.vw_stripe_webhook_alert_failure_rate IS 'Alert if max_fail_rate_pct > 1.0';

-- 3) ヘルスチェック：全体サマリ
CREATE OR REPLACE VIEW public.vw_stripe_webhook_health AS
SELECT
  -- 総イベント数
  COUNT(*) AS total_events,

  -- 成功/失敗/未処理
  COUNT(*) FILTER (WHERE processed = TRUE AND error IS NULL) AS succeeded,
  COUNT(*) FILTER (WHERE processed = FALSE OR error IS NOT NULL) AS failed,
  COUNT(*) FILTER (WHERE processed = FALSE AND error IS NULL) AS pending,

  -- 失敗率
  ROUND(100.0 * COUNT(*) FILTER (WHERE processed = FALSE OR error IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS overall_fail_rate_pct,

  -- 直近24時間
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h_events,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours' AND (processed = FALSE OR error IS NOT NULL)) AS last_24h_failed,

  -- 最古/最新イベント
  MIN(created_at) AS oldest_event_at,
  MAX(created_at) AS newest_event_at
FROM public.stripe_webhook_events;

COMMENT ON VIEW public.vw_stripe_webhook_health IS 'Overall health check for Stripe Webhook system';

-- 4) 失敗イベント詳細（デバッグ用）
CREATE OR REPLACE VIEW public.vw_stripe_webhook_failures AS
SELECT
  event_id,
  type,
  created_at,
  error,
  idempotency_key,
  processed_at,
  (payload->>'livemode')::BOOLEAN AS livemode
FROM public.stripe_webhook_events
WHERE processed = FALSE OR error IS NOT NULL
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON VIEW public.vw_stripe_webhook_failures IS 'Recent failed events with details for debugging';

-- 5) 日次返金サマリ（金額追跡）
CREATE OR REPLACE VIEW public.vw_daily_refund_summary AS
SELECT
  DATE(ad.deleted_at) AS deletion_date,
  COUNT(*) AS total_deletions,
  COUNT(*) FILTER (WHERE ad.stripe_credit_note_id IS NOT NULL) AS with_refund,
  SUM(ad.stripe_refund_amount) AS total_refund_amount,
  ROUND(AVG(ad.stripe_refund_amount), 2) AS avg_refund_amount
FROM public.account_deletions ad
WHERE ad.deleted_at IS NOT NULL
GROUP BY DATE(ad.deleted_at)
ORDER BY deletion_date DESC;

COMMENT ON VIEW public.vw_daily_refund_summary IS 'Daily summary of account deletions and refunds';
