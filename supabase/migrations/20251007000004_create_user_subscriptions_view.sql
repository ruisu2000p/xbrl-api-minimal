-- publicスキーマにuser_subscriptionsのVIEWを作成
-- Migration: 20251007000004_create_user_subscriptions_view

-- VIEWを作成
CREATE OR REPLACE VIEW public.user_subscriptions AS
SELECT
  us.id,
  us.user_id,
  us.plan_id,
  us.status,
  us.billing_cycle,
  us.current_period_start,
  us.current_period_end,
  us.cancel_at_period_end,
  us.cancelled_at,
  us.trial_end,
  us.created_at,
  us.updated_at
FROM private.user_subscriptions us;

-- subscription_plansもpublicに公開
CREATE OR REPLACE VIEW public.subscription_plans AS
SELECT
  sp.id,
  sp.name,
  sp.description,
  sp.price_monthly,
  sp.price_yearly,
  sp.requests_per_hour,
  sp.requests_per_day,
  sp.requests_per_month,
  sp.features,
  sp.is_active,
  sp.display_order,
  sp.created_at,
  sp.updated_at
FROM private.subscription_plans sp;

-- VIEWにはRLSポリシーは不要
-- security_invokerを使用して、VIEWを通じて基礎テーブルのRLSが適用されるようにする
ALTER VIEW public.user_subscriptions SET (security_invoker = true);
ALTER VIEW public.subscription_plans SET (security_invoker = true);
