-- Smoke test for USD/JPY currency support
--
-- Purpose: クイック動作確認（30秒）
-- - 関数の型解決確認
-- - 制約の動作確認
-- - ビューの集計確認
--
-- 注意: このファイルは本番適用不要（テスト用）
-- 実行する場合は BEGIN; ... ROLLBACK; で囲んでください

-- ============================================
-- 1) 関数テスト（型解決と変換ロジック）
-- ============================================

-- bigint 版（SUM 用）
SELECT
  public.amount_major(4900::bigint, 'usd') AS usd_bigint,  -- 期待値: 49.00
  public.amount_major(5000::bigint, 'jpy') AS jpy_bigint;  -- 期待値: 5000.00

-- numeric 版（AVG 用）
SELECT
  public.amount_major(4900.50::numeric, 'usd') AS usd_numeric,  -- 期待値: 49.005
  public.amount_major(5000.75::numeric, 'jpy') AS jpy_numeric;  -- 期待値: 5000.75

-- 両方が正しく動作するか
SELECT
  public.amount_major(4900, 'usd') = 49.00 AS usd_ok,
  public.amount_major(5000, 'jpy') = 5000.00 AS jpy_ok;

-- ============================================
-- 2) 制約テスト（トランザクション内で実行推奨）
-- ============================================

-- BEGIN;

-- 2-1) 通貨制約テスト（EUR は許可されていない）
-- 期待結果: エラー「violates check constraint "account_deletions_currency_chk"」
-- INSERT INTO public.account_deletions (stripe_currency, stripe_refund_amount, deleted_at)
-- VALUES ('eur', 100, NOW());

-- 2-2) 非負制約テスト（負の値は許可されていない）
-- 期待結果: エラー「violates check constraint "ad_refund_amount_nonneg_chk"」
-- INSERT INTO public.account_deletions (stripe_currency, stripe_refund_amount, deleted_at)
-- VALUES ('usd', -1, NOW());

-- ROLLBACK;

-- ============================================
-- 3) ビューテスト（通貨別集計の確認）
-- ============================================

-- 通貨別サマリ（最大5件）
SELECT
  deletion_date,
  currency,
  total_deletions,
  with_refund,
  total_refund_amount_minor,
  total_refund_amount_major,
  avg_refund_amount_major
FROM public.vw_daily_refund_summary_by_currency
ORDER BY deletion_date DESC, currency
LIMIT 5;

-- 通貨が分かれて集計されているか確認
SELECT
  currency,
  COUNT(DISTINCT deletion_date) AS days_with_deletions,
  SUM(total_deletions) AS total_deletions_all_time
FROM public.vw_daily_refund_summary_by_currency
GROUP BY currency;

-- ============================================
-- 4) monitor ロールのアクセステスト（オプション）
-- ============================================

-- monitor ロールで実行（接続を切り替えて確認）
-- SET ROLE monitor;
-- SELECT * FROM public.vw_daily_refund_summary_by_currency LIMIT 3;
-- SELECT * FROM public.vw_stripe_webhook_health;
-- RESET ROLE;

-- ============================================
-- 期待される結果:
-- 1) 関数テスト: usd_ok=true, jpy_ok=true
-- 2) 制約テスト: 両方ともエラーになること
-- 3) ビューテスト: 通貨ごとに行が分かれて表示されること
-- 4) monitor テスト: エラーなくビューが参照できること
-- ============================================
