-- Add Stripe columns to user_subscriptions table
-- This migration adds the necessary columns for Stripe integration

-- Add stripe_customer_id column
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add stripe_subscription_id column
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id
ON public.user_subscriptions(stripe_customer_id);

-- Create index on stripe_subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id
ON public.user_subscriptions(stripe_subscription_id);

-- Add unique constraint on stripe_subscription_id (one subscription per Stripe subscription)
ALTER TABLE public.user_subscriptions
ADD CONSTRAINT unique_stripe_subscription_id
UNIQUE (stripe_subscription_id);

-- Comment on columns
COMMENT ON COLUMN public.user_subscriptions.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
