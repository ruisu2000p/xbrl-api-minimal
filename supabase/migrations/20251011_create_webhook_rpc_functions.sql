-- RPC function to update user subscription from webhook
CREATE OR REPLACE FUNCTION public.update_user_subscription_from_webhook(
  p_user_id UUID,
  p_plan_id UUID,
  p_status TEXT,
  p_stripe_subscription_id TEXT,
  p_stripe_customer_id TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  UPDATE private.user_subscriptions
  SET
    plan_id = p_plan_id,
    status = p_status,
    stripe_subscription_id = p_stripe_subscription_id,
    stripe_customer_id = p_stripe_customer_id,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- RPC function to update subscription status
CREATE OR REPLACE FUNCTION public.update_subscription_status_from_webhook(
  p_stripe_subscription_id TEXT,
  p_status TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  UPDATE private.user_subscriptions
  SET
    status = p_status,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    cancel_at_period_end = p_cancel_at_period_end,
    updated_at = NOW()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
END;
$$;

-- RPC function to cancel subscription
CREATE OR REPLACE FUNCTION public.cancel_user_subscription_from_webhook(
  p_stripe_subscription_id TEXT,
  p_freemium_plan_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  UPDATE private.user_subscriptions
  SET
    plan_id = p_freemium_plan_id,
    status = 'cancelled',
    cancelled_at = NOW(),
    stripe_subscription_id = NULL,
    stripe_customer_id = NULL,
    updated_at = NOW()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
END;
$$;
