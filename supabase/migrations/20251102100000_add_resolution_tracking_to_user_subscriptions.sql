-- Add resolution path tracking for Stripe subscription resolution
-- This helps debug and monitor how subscriptions are resolved

-- Add last_resolution_path column
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS last_resolution_path TEXT;

-- Add last_resolved_at timestamp
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS last_resolved_at TIMESTAMPTZ;

-- Comment on columns
COMMENT ON COLUMN public.user_subscriptions.last_resolution_path IS 'How the Stripe subscription was resolved: by_subscription_id | by_customer_id | by_email_search | self_healed';
COMMENT ON COLUMN public.user_subscriptions.last_resolved_at IS 'When the Stripe subscription was last resolved';
