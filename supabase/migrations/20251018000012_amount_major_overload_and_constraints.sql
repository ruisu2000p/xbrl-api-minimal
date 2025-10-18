-- amount_major overload and final constraints
--
-- Purpose: 型まわりと関数呼び出しのつまずきをゼロに
-- - amount_major の numeric 版オーバーロード（AVG 対応）
-- - 非負チェック制約（返金額は0以上）
-- - ビューの最終形（スキーマ修飾 + NULL 除外）

-- 1) amount_major のオーバーロード（bigint版 + numeric版）
-- SUM(int) は bigint、AVG(int) は numeric を返すため、両方に対応

-- bigint 版（SUM 対応）
CREATE OR REPLACE FUNCTION public.amount_major(amount_minor bigint, currency text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(currency) = 'jpy' THEN amount_minor::numeric
    WHEN lower(currency) = 'usd' THEN amount_minor::numeric / 100.0
    ELSE amount_minor::numeric
  END
$$;

COMMENT ON FUNCTION public.amount_major(bigint, text)
  IS '最小通貨単位→表示単位（bigint入力対応: USD=/100, JPY=/1）';

-- numeric 版（AVG 対応）
CREATE OR REPLACE FUNCTION public.amount_major(amount_minor numeric, currency text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(currency) = 'jpy' THEN amount_minor
    WHEN lower(currency) = 'usd' THEN amount_minor / 100.0
    ELSE amount_minor
  END
$$;

COMMENT ON FUNCTION public.amount_major(numeric, text)
  IS '最小通貨単位→表示単位（numeric入力対応: USD=/100, JPY=/1）';

-- 2) 非負チェック制約（返金額は0以上）
ALTER TABLE public.account_deletions
  DROP CONSTRAINT IF EXISTS ad_refund_amount_nonneg_chk;

ALTER TABLE public.account_deletions
  ADD CONSTRAINT ad_refund_amount_nonneg_chk
  CHECK (stripe_refund_amount IS NULL OR stripe_refund_amount >= 0);

COMMENT ON CONSTRAINT ad_refund_amount_nonneg_chk ON public.account_deletions
  IS 'Refund amount must be non-negative (0 or positive integer)';

-- 3) ビューの最終形（スキーマ修飾 + NULL 除外）
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
  public.amount_major(COALESCE(SUM(ad.stripe_refund_amount), 0), ad.stripe_currency) AS total_refund_amount_major,
  ROUND(public.amount_major(COALESCE(AVG(ad.stripe_refund_amount), 0), ad.stripe_currency), 2) AS avg_refund_amount_major

FROM public.account_deletions ad
WHERE ad.deleted_at IS NOT NULL
  AND ad.stripe_currency IS NOT NULL      -- 通貨未設定行は除外（会計上の整合）
GROUP BY DATE(ad.deleted_at), lower(ad.stripe_currency)
ORDER BY deletion_date DESC, currency;

COMMENT ON VIEW public.vw_daily_refund_summary_by_currency
  IS 'Daily refund summary by currency (safe aggregation, currency-NULL rows excluded). Amounts in both minor and major units.';

-- monitor ロールに権限再付与（念のため）
GRANT SELECT ON public.vw_daily_refund_summary_by_currency TO monitor;
