-- Create monitoring view for Stripe Webhook events
--
-- Purpose: 可視化と運用
-- - 未処理/失敗イベントを即座に確認
-- - ダッシュボード代わりに使える
-- - "取りこぼしゼロ"運用を実現

CREATE OR REPLACE VIEW vw_stripe_webhook_events_pending AS
SELECT
  event_id,
  type,
  created_at,
  error,
  idempotency_key,
  processed_at
FROM stripe_webhook_events
WHERE processed = FALSE
ORDER BY created_at DESC;

COMMENT ON VIEW vw_stripe_webhook_events_pending IS 'Pending or failed Stripe Webhook events for monitoring';

-- 成功イベントの統計ビュー（オプション）
CREATE OR REPLACE VIEW vw_stripe_webhook_stats AS
SELECT
  type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE processed = TRUE) as processed_count,
  COUNT(*) FILTER (WHERE processed = FALSE) as pending_count,
  MAX(created_at) as last_received_at
FROM stripe_webhook_events
GROUP BY type
ORDER BY total_count DESC;

COMMENT ON VIEW vw_stripe_webhook_stats IS 'Statistics of Stripe Webhook events by type';
