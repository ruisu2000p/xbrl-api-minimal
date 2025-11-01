-- Enable pgcrypto extension for gen_random_uuid() (insurance, usually pre-enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure stripe_webhook_events table has proper unique constraint on event_id
-- This prevents duplicate webhook event processing

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT
);

-- Add unique constraint on event_id if it doesn't exist
-- This ensures idempotency for Stripe webhook retries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stripe_webhook_events_event_id_key'
    AND conrelid = 'public.stripe_webhook_events'::regclass
  ) THEN
    ALTER TABLE public.stripe_webhook_events
      ADD CONSTRAINT stripe_webhook_events_event_id_key UNIQUE (event_id);
  END IF;
END $$;

-- Add index on processed status for efficient querying
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed
  ON public.stripe_webhook_events(processed, created_at DESC);

-- Add index on event type
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events(type);

-- Enable RLS (if not already enabled)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write (webhook handler uses service role)
DROP POLICY IF EXISTS "Service role has full access" ON public.stripe_webhook_events;
CREATE POLICY "Service role has full access"
  ON public.stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Stores Stripe webhook events for idempotency and audit trail. The event_id is unique to prevent duplicate processing.';

COMMENT ON CONSTRAINT stripe_webhook_events_event_id_key ON public.stripe_webhook_events IS
  'Ensures each Stripe event is processed exactly once (idempotency).';
