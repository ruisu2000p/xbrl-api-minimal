-- Fix search_path security warning for amount_major function
--
-- Purpose: Linter対応 - search_path を固定してセキュリティ強化
-- - SECURITY DEFINER + SET search_path でスキーマインジェクション防止
-- - 両方のオーバーロード（bigint, numeric）に適用

-- ビューを一時削除（関数再作成のため）
DROP VIEW IF EXISTS public.vw_daily_refund_summary_by_currency CASCADE;

-- bigint 版を再作成（search_path 固定）
DROP FUNCTION IF EXISTS public.amount_major(bigint, text) CASCADE;

CREATE FUNCTION public.amount_major(amount_minor bigint, currency text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN lower(currency) = 'jpy' THEN amount_minor::numeric
    WHEN lower(currency) = 'usd' THEN amount_minor::numeric / 100.0
    ELSE amount_minor::numeric
  END
$$;

COMMENT ON FUNCTION public.amount_major(bigint, text)
  IS '最小通貨単位→表示単位（bigint入力対応: USD=/100, JPY=/1）- search_path固定';

-- numeric 版を再作成（search_path 固定）
DROP FUNCTION IF EXISTS public.amount_major(numeric, text) CASCADE;

CREATE FUNCTION public.amount_major(amount_minor numeric, currency text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN lower(currency) = 'jpy' THEN amount_minor
    WHEN lower(currency) = 'usd' THEN amount_minor / 100.0
    ELSE amount_minor
  END
$$;

COMMENT ON FUNCTION public.amount_major(numeric, text)
  IS '最小通貨単位→表示単位（numeric入力対応: USD=/100, JPY=/1）- search_path固定';

-- ビューを再作成
CREATE OR REPLACE VIEW public.vw_daily_refund_summary_by_currency AS
SELECT
  DATE(ad.deleted_at)                       AS deletion_date,
  lower(ad.stripe_currency)                 AS currency,
  COUNT(*)                                  AS total_deletions,
  COUNT(*) FILTER (WHERE ad.stripe_credit_note_id IS NOT NULL) AS with_refund,

  -- minor（保存形式）
  COALESCE(SUM(ad.stripe_refund_amount), 0)                    AS total_refund_amount_minor,
  ROUND(COALESCE(AVG(ad.stripe_refund_amount), 0), 2)          AS avg_refund_amount_minor,

  -- major（表示形式）- スキーマ修飾で search_path 影響を回避
  public.amount_major(COALESCE(SUM(ad.stripe_refund_amount), 0), lower(ad.stripe_currency)) AS total_refund_amount_major,
  ROUND(public.amount_major(COALESCE(AVG(ad.stripe_refund_amount), 0), lower(ad.stripe_currency)), 2) AS avg_refund_amount_major

FROM public.account_deletions ad
WHERE ad.deleted_at IS NOT NULL
  AND ad.stripe_currency IS NOT NULL
GROUP BY DATE(ad.deleted_at), lower(ad.stripe_currency)
ORDER BY deletion_date DESC, currency;

COMMENT ON VIEW public.vw_daily_refund_summary_by_currency
  IS 'Daily refund summary by currency (safe aggregation, currency-NULL rows excluded). Amounts in both minor and major units.';

-- monitor ロールに権限再付与
GRANT SELECT ON public.vw_daily_refund_summary_by_currency TO monitor;
