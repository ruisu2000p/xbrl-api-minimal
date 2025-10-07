-- user_subscriptionsへのUPDATE権限を付与
-- Migration: 20251007000007_grant_update_permission

-- private.user_subscriptionsテーブルへのUPDATE権限を付与
GRANT UPDATE ON private.user_subscriptions TO authenticated;

-- public VIEWにもUPDATE権限を付与（security_invokerで基礎テーブルの権限を使用）
GRANT UPDATE ON public.user_subscriptions TO authenticated;
