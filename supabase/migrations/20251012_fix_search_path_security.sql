-- Fix search_path security issue for webhook RPC functions
-- This prevents Search Path Injection attacks

-- 1. Fix update_user_subscription_from_webhook
DROP FUNCTION IF EXISTS public.update_user_subscription_from_webhook(uuid, uuid, text, text, text, timestamptz, timestamptz, text);

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
SET search_path = public, pg_temp  -- Added for security
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_user_subscription_from_webhook TO authenticated, service_role;

-- 2. Fix update_subscription_status_from_webhook
DROP FUNCTION IF EXISTS public.update_subscription_status_from_webhook(text, text, timestamptz, timestamptz, boolean);

CREATE OR REPLACE FUNCTION public.update_subscription_status_from_webhook(
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- Added for security
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

GRANT EXECUTE ON FUNCTION public.update_subscription_status_from_webhook TO authenticated, service_role;

-- 3. Fix cancel_user_subscription_from_webhook
DROP FUNCTION IF EXISTS public.cancel_user_subscription_from_webhook(text, uuid);

CREATE OR REPLACE FUNCTION public.cancel_user_subscription_from_webhook(
  p_stripe_subscription_id text,
  p_freemium_plan_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- Added for security
AS $$
BEGIN
  UPDATE private.user_subscriptions
  SET
    plan_id = p_freemium_plan_id,
    status = 'canceled',
    stripe_subscription_id = NULL,
    cancel_at_period_end = false,
    updated_at = NOW()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_user_subscription_from_webhook TO authenticated, service_role;

-- 4. Fix get_user_id_from_subscription
DROP FUNCTION IF EXISTS public.get_user_id_from_subscription(text);

CREATE OR REPLACE FUNCTION public.get_user_id_from_subscription(
  p_stripe_subscription_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- Added for security
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id
  FROM private.user_subscriptions
  WHERE stripe_subscription_id = p_stripe_subscription_id;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_from_subscription TO authenticated, service_role;

-- 5. Fix upsert_invoice_from_webhook
DROP FUNCTION IF EXISTS public.upsert_invoice_from_webhook(uuid, text, text, integer, integer, text, text, text, text, text, timestamptz, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.upsert_invoice_from_webhook(
  p_user_id uuid,
  p_stripe_invoice_id text,
  p_stripe_subscription_id text,
  p_amount_due integer,
  p_amount_paid integer,
  p_currency text,
  p_status text,
  p_invoice_pdf text,
  p_hosted_invoice_url text,
  p_billing_reason text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_paid_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- Added for security
AS $$
BEGIN
  INSERT INTO private.invoices (
    user_id,
    stripe_invoice_id,
    stripe_subscription_id,
    amount_due,
    amount_paid,
    currency,
    status,
    invoice_pdf,
    hosted_invoice_url,
    billing_reason,
    period_start,
    period_end,
    paid_at,
    created_at
  ) VALUES (
    p_user_id,
    p_stripe_invoice_id,
    p_stripe_subscription_id,
    p_amount_due,
    p_amount_paid,
    p_currency,
    p_status,
    p_invoice_pdf,
    p_hosted_invoice_url,
    p_billing_reason,
    p_period_start,
    p_period_end,
    p_paid_at,
    NOW()
  )
  ON CONFLICT (stripe_invoice_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    amount_paid = EXCLUDED.amount_paid,
    invoice_pdf = EXCLUDED.invoice_pdf,
    hosted_invoice_url = EXCLUDED.hosted_invoice_url,
    paid_at = EXCLUDED.paid_at,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_invoice_from_webhook TO authenticated, service_role;
