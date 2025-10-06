-- billing_cycleにlifetimeを追加
-- Migration: 20251007000003_add_lifetime_billing_cycle

-- 既存の制約を削除
ALTER TABLE private.user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_billing_cycle_check;

-- 新しい制約を追加（lifetime を含む）
ALTER TABLE private.user_subscriptions
ADD CONSTRAINT user_subscriptions_billing_cycle_check
CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime'));
