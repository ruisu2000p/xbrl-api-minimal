-- USD and JPY currency support with safe aggregation
--
-- Purpose: 複数通貨の安全な運用
-- - 通貨制約（USD, JPY のみ許可）
-- - 最小通貨単位での保存（USD=cents, JPY=yen）
-- - 通貨別の集計（混在合算を防ぐ）
-- - 表示用の major 変換関数

-- 1) 通貨制約の追加（既存データ対応のため NULL 許容）
ALTER TABLE public.account_deletions
  DROP CONSTRAINT IF EXISTS account_deletions_currency_chk;

ALTER TABLE public.account_deletions
  ADD CONSTRAINT account_deletions_currency_chk
  CHECK (stripe_currency IS NULL OR lower(stripe_currency) IN ('usd', 'jpy'));

COMMENT ON CONSTRAINT account_deletions_currency_chk ON public.account_deletions
  IS 'Allow only USD and JPY currencies (lowercase ISO 4217 codes)';

-- 2) インデックスの最適化（日付×通貨での集計用）
DROP INDEX IF EXISTS public.idx_account_deletions_currency_deleted;

CREATE INDEX IF NOT EXISTS idx_account_deletions_deleted_at_currency
  ON public.account_deletions (date(deleted_at), stripe_currency)
  WHERE deleted_at IS NOT NULL;

COMMENT ON INDEX idx_account_deletions_deleted_at_currency
  IS 'Optimize daily currency-based aggregation queries';

-- 3) 表示用の major 変換関数（USD=/100, JPY=/1）
CREATE OR REPLACE FUNCTION public.amount_major(amount_minor bigint, currency text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(currency) = 'jpy' THEN amount_minor::numeric
    WHEN lower(currency) = 'usd' THEN amount_minor::numeric / 100.0
    ELSE amount_minor::numeric  -- 将来拡張時はここに追記
  END
$$;

COMMENT ON FUNCTION public.amount_major
  IS '最小通貨単位→表示単位への変換 (USD=/100, JPY=/1)';

-- 4) 通貨別返金サマリ（minor と major 両方を提供）
CREATE OR REPLACE VIEW public.vw_daily_refund_summary_by_currency AS
SELECT
  DATE(ad.deleted_at) AS deletion_date,
  lower(ad.stripe_currency) AS currency,
  COUNT(*) AS total_deletions,
  COUNT(*) FILTER (WHERE ad.stripe_credit_note_id IS NOT NULL) AS with_refund,
  COALESCE(SUM(ad.stripe_refund_amount), 0) AS total_refund_amount_minor,
  ROUND(COALESCE(AVG(ad.stripe_refund_amount), 0), 2) AS avg_refund_amount_minor,
  public.amount_major(COALESCE(SUM(ad.stripe_refund_amount), 0), COALESCE(ad.stripe_currency, 'jpy')) AS total_refund_amount_major,
  ROUND(public.amount_major(COALESCE(AVG(ad.stripe_refund_amount), 0), COALESCE(ad.stripe_currency, 'jpy')), 2) AS avg_refund_amount_major
FROM public.account_deletions ad
WHERE ad.deleted_at IS NOT NULL
GROUP BY DATE(ad.deleted_at), lower(ad.stripe_currency)
ORDER BY deletion_date DESC, currency;

COMMENT ON VIEW public.vw_daily_refund_summary_by_currency
  IS 'Daily refund summary by currency (safe aggregation, no mixed currency totals). Amounts in both minor and major units.';

-- monitor ロールに権限付与
GRANT SELECT ON public.vw_daily_refund_summary_by_currency TO monitor;

-- 5) 全体サマリ（通貨非依存のため変更なし、参考用）
-- vw_daily_refund_summary は件数のみのサマリとして維持
CREATE OR REPLACE VIEW public.vw_daily_refund_summary AS
SELECT
  DATE(ad.deleted_at) AS deletion_date,
  COUNT(*) AS total_deletions,
  COUNT(*) FILTER (WHERE ad.stripe_credit_note_id IS NOT NULL) AS with_refund,
  COUNT(DISTINCT ad.stripe_currency) AS currency_count
FROM public.account_deletions ad
WHERE ad.deleted_at IS NOT NULL
GROUP BY DATE(ad.deleted_at)
ORDER BY deletion_date DESC;

COMMENT ON VIEW public.vw_daily_refund_summary
  IS 'Daily deletion summary (count only, currency-agnostic). Use vw_daily_refund_summary_by_currency for amounts.';
