-- RPC function to get user_id from stripe_subscription_id
CREATE OR REPLACE FUNCTION public.get_user_id_from_subscription(
  p_stripe_subscription_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM private.user_subscriptions
  WHERE stripe_subscription_id = p_stripe_subscription_id
  LIMIT 1;

  RETURN v_user_id;
END;
$$;
