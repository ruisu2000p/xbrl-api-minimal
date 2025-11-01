-- Fix get_user_subscription_snapshot RPC function to include created_at field
-- This fixes the 500 error in account deletion where code tries to access created_at

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS public.get_user_subscription_snapshot(uuid);

-- Recreate with the updated return type including created_at
CREATE FUNCTION public.get_user_subscription_snapshot(user_uuid uuid)
RETURNS TABLE(
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan_id uuid,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'private', 'public'
AS $$
  SELECT
    stripe_customer_id,
    stripe_subscription_id,
    status,
    plan_id,
    cancelled_at,
    created_at
  FROM private.user_subscriptions
  WHERE user_id = user_uuid
  LIMIT 1;
$$;
