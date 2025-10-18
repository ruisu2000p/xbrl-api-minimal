-- RLS policies for monitor role and currency support
--
-- Purpose: 実務で安定した運用のための追加改善
-- - monitor ロールがビュー経由でデータを見られるようにRLSポリシー追加
-- - 通貨列の追加（将来の多通貨対応）
-- - 通貨別サマリビューの修正

-- 1) monitor ロール向け READ ポリシー（ビュー経由での参照を保証）
CREATE POLICY monitor_can_read_stripe_webhook_events
  ON public.stripe_webhook_events
  FOR SELECT
  TO monitor
  USING (true);

COMMENT ON POLICY monitor_can_read_stripe_webhook_events ON public.stripe_webhook_events
  IS 'Allow monitor role to read webhook events via views (RLS-safe)';

-- 2) account_deletions に通貨列を追加（将来の多通貨対応）
ALTER TABLE public.account_deletions
  ADD COLUMN IF NOT EXISTS stripe_currency TEXT DEFAULT 'jpy';

COMMENT ON COLUMN public.account_deletions.stripe_currency
  IS 'Currency code from Stripe (ISO 4217, lowercase). Default: jpy for backward compatibility';

-- 3) 通貨別返金サマリを動的通貨対応に修正
CREATE OR REPLACE VIEW public.vw_daily_refund_summary_by_currency AS
SELECT
  DATE(ad.deleted_at) AS deletion_date,
  COALESCE(ad.stripe_currency, 'jpy') AS currency,
  COUNT(*) AS total_deletions,
  COUNT(*) FILTER (WHERE ad.stripe_credit_note_id IS NOT NULL) AS with_refund,
  COALESCE(SUM(ad.stripe_refund_amount), 0) AS total_refund_amount_minor,
  ROUND(COALESCE(AVG(ad.stripe_refund_amount), 0), 2) AS avg_refund_amount_minor
FROM public.account_deletions ad
WHERE ad.deleted_at IS NOT NULL
GROUP BY DATE(ad.deleted_at), COALESCE(ad.stripe_currency, 'jpy')
ORDER BY deletion_date DESC, currency;

COMMENT ON VIEW public.vw_daily_refund_summary_by_currency
  IS 'Daily refund summary by currency (amounts in minor units: cents for USD, yen for JPY)';

-- monitor ロールに新ビューへのアクセス権を再付与（念のため）
GRANT SELECT ON public.vw_daily_refund_summary_by_currency TO monitor;

-- 4) インデックス追加（通貨別の集計クエリ最適化）
CREATE INDEX IF NOT EXISTS idx_account_deletions_currency_deleted
  ON public.account_deletions(stripe_currency, deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON INDEX idx_account_deletions_currency_deleted
  IS 'Optimize currency-based aggregation queries';
