-- Create stripe_events table for idempotency (webhook event deduplication)
CREATE TABLE IF NOT EXISTS private.stripe_events (
  id TEXT PRIMARY KEY, -- Stripe Event ID (evt_xxx)
  payload JSONB NOT NULL, -- Full event object from Stripe
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON private.stripe_events(created_at DESC);

-- Auto-delete events older than 30 days (optional cleanup)
COMMENT ON TABLE private.stripe_events IS 'Stores processed Stripe webhook events for idempotency. Events older than 30 days can be safely deleted.';
