-- 既存ユーザーにフリーミアムプランを割り当て
-- Migration: 20251007000001_assign_freemium_to_existing_users

-- demddddo@example.com ユーザーにフリーミアムプランを設定
INSERT INTO private.user_subscriptions
(user_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end)
SELECT
  u.id as user_id,
  sp.id as plan_id,
  'active' as status,
  'lifetime' as billing_cycle,
  NOW() as current_period_start,
  NOW() + INTERVAL '100 years' as current_period_end,
  false as cancel_at_period_end
FROM auth.users u
CROSS JOIN private.subscription_plans sp
WHERE u.email = 'demddddo@example.com'
  AND sp.name = 'freemium'
  AND NOT EXISTS (
    SELECT 1 FROM private.user_subscriptions us
    WHERE us.user_id = u.id
  )
LIMIT 1;

-- test_playwright_001@example.com ユーザーにもフリーミアムプランを設定（テスト用）
INSERT INTO private.user_subscriptions
(user_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end)
SELECT
  u.id as user_id,
  sp.id as plan_id,
  'active' as status,
  'lifetime' as billing_cycle,
  NOW() as current_period_start,
  NOW() + INTERVAL '100 years' as current_period_end,
  false as cancel_at_period_end
FROM auth.users u
CROSS JOIN private.subscription_plans sp
WHERE u.email = 'test_playwright_001@example.com'
  AND sp.name = 'freemium'
  AND NOT EXISTS (
    SELECT 1 FROM private.user_subscriptions us
    WHERE us.user_id = u.id
  )
LIMIT 1;

-- ddd3334433demo@example.com ユーザーにフリーミアムプランを設定
INSERT INTO private.user_subscriptions
(user_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end)
SELECT
  u.id as user_id,
  sp.id as plan_id,
  'active' as status,
  'lifetime' as billing_cycle,
  NOW() as current_period_start,
  NOW() + INTERVAL '100 years' as current_period_end,
  false as cancel_at_period_end
FROM auth.users u
CROSS JOIN private.subscription_plans sp
WHERE u.email = 'ddd3334433demo@example.com'
  AND sp.name = 'freemium'
  AND NOT EXISTS (
    SELECT 1 FROM private.user_subscriptions us
    WHERE us.user_id = u.id
  )
LIMIT 1;
