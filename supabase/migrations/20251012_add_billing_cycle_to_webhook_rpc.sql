-- Add billing_cycle parameter to update_user_subscription_from_webhook RPC function

-- Drop the existing function
DROP FUNCTION IF EXISTS public.update_user_subscription_from_webhook(uuid, uuid, text, text, text, timestamptz, timestamptz);

-- Recreate with billing_cycle parameter
CREATE OR REPLACE FUNCTION public.update_user_subscription_from_webhook(
  p_user_id uuid,
  p_plan_id uuid,
  p_status text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_billing_cycle text DEFAULT 'monthly'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update or insert user subscription
  INSERT INTO private.user_subscriptions (
    user_id,
    plan_id,
    status,
    stripe_subscription_id,
    stripe_customer_id,
    current_period_start,
    current_period_end,
    billing_cycle,
    updated_at
  ) VALUES (
    p_user_id,
    p_plan_id,
    p_status,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_current_period_start,
    p_current_period_end,
    p_billing_cycle,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    billing_cycle = EXCLUDED.billing_cycle,
    updated_at = NOW();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_subscription_from_webhook TO authenticated, service_role;
