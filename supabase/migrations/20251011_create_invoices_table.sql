-- Create invoices table to store Stripe invoice information
CREATE TABLE IF NOT EXISTS private.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,
  amount_due INTEGER NOT NULL, -- 支払額（セント単位）
  amount_paid INTEGER NOT NULL, -- 支払済額（セント単位）
  currency TEXT NOT NULL DEFAULT 'jpy',
  status TEXT NOT NULL, -- draft, open, paid, void, uncollectible
  invoice_pdf TEXT, -- PDF URL
  hosted_invoice_url TEXT, -- Stripeのホストされた請求書URL
  billing_reason TEXT, -- subscription_create, subscription_cycle, etc.
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON private.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON private.invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_subscription_id ON private.invoices(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON private.invoices(status);

-- RPC function to insert/update invoice from webhook
CREATE OR REPLACE FUNCTION public.upsert_invoice_from_webhook(
  p_user_id UUID,
  p_stripe_invoice_id TEXT,
  p_stripe_subscription_id TEXT,
  p_amount_due INTEGER,
  p_amount_paid INTEGER,
  p_currency TEXT,
  p_status TEXT,
  p_invoice_pdf TEXT,
  p_hosted_invoice_url TEXT,
  p_billing_reason TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_paid_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
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
    created_at,
    updated_at
  )
  VALUES (
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
    NOW(),
    NOW()
  )
  ON CONFLICT (stripe_invoice_id)
  DO UPDATE SET
    stripe_subscription_id = p_stripe_subscription_id,
    amount_due = p_amount_due,
    amount_paid = p_amount_paid,
    currency = p_currency,
    status = p_status,
    invoice_pdf = p_invoice_pdf,
    hosted_invoice_url = p_hosted_invoice_url,
    billing_reason = p_billing_reason,
    period_start = p_period_start,
    period_end = p_period_end,
    paid_at = p_paid_at,
    updated_at = NOW();
END;
$$;

-- RPC function to get user's invoices
CREATE OR REPLACE FUNCTION public.get_user_invoices(
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  stripe_invoice_id TEXT,
  stripe_subscription_id TEXT,
  amount_due INTEGER,
  amount_paid INTEGER,
  currency TEXT,
  status TEXT,
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  billing_reason TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.stripe_invoice_id,
    i.stripe_subscription_id,
    i.amount_due,
    i.amount_paid,
    i.currency,
    i.status,
    i.invoice_pdf,
    i.hosted_invoice_url,
    i.billing_reason,
    i.period_start,
    i.period_end,
    i.created_at,
    i.paid_at
  FROM private.invoices i
  WHERE i.user_id = p_user_id
  ORDER BY i.created_at DESC;
END;
$$;
