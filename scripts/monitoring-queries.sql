-- Monitoring SQL Queries for Subscription System
-- Run these periodically to detect anomalies and stuck states

-- =============================================================================
-- 1. Stuck Pending Actions (30分以上pending)
-- =============================================================================
-- Webhookが失敗/遅延してpending_actionが残っているレコードを検出
SELECT
  user_id,
  stripe_subscription_id,
  pending_action,
  status,
  cancel_at_period_end,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS minutes_stuck
FROM user_subscriptions
WHERE pending_action IS NOT NULL
  AND updated_at < NOW() - INTERVAL '30 minutes'
ORDER BY updated_at ASC;

-- =============================================================================
-- 2. Resolution Path Distribution (過去24時間)
-- =============================================================================
-- どの解決戦略が最も使われているかを確認
SELECT
  last_resolution_path,
  COUNT(*) AS count,
  COUNT(CASE WHEN pending_action IS NOT NULL THEN 1 END) AS pending_count
FROM user_subscriptions
WHERE last_resolved_at > NOW() - INTERVAL '24 hours'
GROUP BY last_resolution_path
ORDER BY count DESC;

-- =============================================================================
-- 3. DB/Stripe Inconsistencies (Stripeにsubscriptionがあるべきだがnull)
-- =============================================================================
-- status='active'なのにstripe_subscription_id=nullのレコードを検出
SELECT
  user_id,
  plan_id,
  status,
  stripe_subscription_id,
  stripe_customer_id,
  updated_at
FROM user_subscriptions
WHERE status IN ('active', 'trialing', 'past_due')
  AND stripe_subscription_id IS NULL;

-- =============================================================================
-- 4. Self-Healing Events (過去7日間)
-- =============================================================================
-- 自己修復が発生した回数をカウント
SELECT
  DATE(last_resolved_at) AS date,
  COUNT(*) AS self_heal_count
FROM user_subscriptions
WHERE last_resolution_path = 'not_found'
  AND last_resolved_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(last_resolved_at)
ORDER BY date DESC;

-- =============================================================================
-- 5. Cancel_at_period_end Tracking (期末キャンセル予定)
-- =============================================================================
-- 期末にキャンセル予定のサブスクリプション一覧
SELECT
  user_id,
  stripe_subscription_id,
  current_period_end,
  status,
  pending_action,
  EXTRACT(EPOCH FROM (current_period_end - NOW())) / 86400 AS days_until_cancel
FROM user_subscriptions
WHERE cancel_at_period_end = TRUE
  AND status != 'canceled'
ORDER BY current_period_end ASC;

-- =============================================================================
-- 6. Recent Downgrades (過去24時間)
-- =============================================================================
-- 最近ダウングレードされたユーザーを確認
SELECT
  user_id,
  stripe_subscription_id,
  status,
  cancel_at_period_end,
  pending_action,
  last_resolution_path,
  updated_at
FROM user_subscriptions
WHERE pending_action = 'downgrade_to_freemium'
  OR (cancel_at_period_end = TRUE AND updated_at > NOW() - INTERVAL '24 hours')
ORDER BY updated_at DESC;

-- =============================================================================
-- 7. Email Resolution Fallbacks (metadata検証なし)
-- =============================================================================
-- email検索でmetadata.app_user_idが一致しなかったケース
-- ログから抽出する必要があるため、SQLでは直接検出不可
-- Vercel Logsで以下を検索:
--   "Using email-matched customer" AND "without metadata.app_user_id validation"

-- =============================================================================
-- 8. Health Check Summary
-- =============================================================================
SELECT
  'Total Subscriptions' AS metric,
  COUNT(*) AS value
FROM user_subscriptions
UNION ALL
SELECT
  'Active/Trialing',
  COUNT(*)
FROM user_subscriptions
WHERE status IN ('active', 'trialing')
UNION ALL
SELECT
  'Pending Actions',
  COUNT(*)
FROM user_subscriptions
WHERE pending_action IS NOT NULL
UNION ALL
SELECT
  'Missing Stripe IDs',
  COUNT(*)
FROM user_subscriptions
WHERE status IN ('active', 'trialing')
  AND stripe_subscription_id IS NULL
UNION ALL
SELECT
  'Cancel at Period End',
  COUNT(*)
FROM user_subscriptions
WHERE cancel_at_period_end = TRUE
  AND status != 'canceled';
