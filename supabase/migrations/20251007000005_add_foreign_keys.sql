-- user_subscriptionsテーブルに外部キー制約を追加
-- Migration: 20251007000005_add_foreign_keys

-- plan_idへの外部キー制約
ALTER TABLE private.user_subscriptions
ADD CONSTRAINT user_subscriptions_plan_id_fkey
FOREIGN KEY (plan_id)
REFERENCES private.subscription_plans(id)
ON DELETE RESTRICT;

-- user_idへの外部キー制約
ALTER TABLE private.user_subscriptions
ADD CONSTRAINT user_subscriptions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
