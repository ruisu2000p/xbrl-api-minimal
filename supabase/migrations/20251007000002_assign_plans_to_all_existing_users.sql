-- 既存ユーザー全員にプランを一括割り当て
-- Migration: 20251007000002_assign_plans_to_all_existing_users

-- user_metadataに記録されたプランに基づいて、サブスクリプションレコードを作成
INSERT INTO private.user_subscriptions
(user_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end)
SELECT
  u.id as user_id,
  sp.id as plan_id,
  'active' as status,
  CASE
    WHEN u.raw_user_meta_data->>'plan' = 'freemium' THEN 'lifetime'
    WHEN u.raw_user_meta_data->>'billing_period' = 'yearly' THEN 'yearly'
    ELSE 'monthly'
  END as billing_cycle,
  NOW() as current_period_start,
  CASE
    WHEN u.raw_user_meta_data->>'plan' = 'freemium' THEN NOW() + INTERVAL '100 years'
    WHEN u.raw_user_meta_data->>'billing_period' = 'yearly' THEN NOW() + INTERVAL '365 days'
    ELSE NOW() + INTERVAL '30 days'
  END as current_period_end,
  false as cancel_at_period_end
FROM auth.users u
JOIN private.subscription_plans sp ON sp.name = COALESCE(u.raw_user_meta_data->>'plan', 'freemium')
WHERE NOT EXISTS (
  SELECT 1 FROM private.user_subscriptions us
  WHERE us.user_id = u.id
);
