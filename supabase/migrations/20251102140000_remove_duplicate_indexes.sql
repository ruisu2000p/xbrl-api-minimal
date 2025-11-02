-- Remove duplicate indexes to improve performance
-- Based on Supabase database linter warnings

-- 1. Remove duplicate index on stripe_webhook_events.type
-- Keep: idx_stripe_webhook_events_type (more descriptive name)
-- Drop: idx_stripe_events_type (older, less descriptive)
drop index if exists public.idx_stripe_events_type;

-- 2. Remove duplicate index on user_subscriptions.stripe_subscription_id
-- Keep: idx_user_subscriptions_stripe_subscription_id (more descriptive)
-- Drop: idx_user_subscriptions_stripe_subscription (shorter, less clear)
drop index if exists private.idx_user_subscriptions_stripe_subscription;

-- 3. Remove redundant UNIQUE constraint on stripe_webhook_events.event_id
-- event_id already has PRIMARY KEY, which automatically enforces uniqueness
-- The separate UNIQUE constraint is redundant
alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_event_id_key;

-- Add comments for clarity
comment on index public.idx_stripe_webhook_events_type is 'Index for filtering webhook events by type';
comment on index private.idx_user_subscriptions_stripe_subscription_id is 'Index for looking up subscriptions by Stripe subscription ID';
