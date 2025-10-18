-- Create stripe_webhook_events table for Stripe Webhook event deduplication and audit
--
-- Purpose: Thin Webhook implementation for "ズレない・直せる・説明できる"
-- - Deduplication via event_id (PRIMARY KEY)
-- - Idempotency key linkage to original operations
-- - Self-healing via automatic retry
-- - Audit trail for support and reconciliation
--
-- Events to monitor (minimal 4):
-- 1. customer.subscription.deleted - Subscription cancellation confirmation
-- 2. invoice.finalized - Invoice finalization confirmation
-- 3. credit_note.created - Refund/credit confirmation
-- 4. charge.refunded - Actual refund confirmation

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id       TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL,
  request_id     TEXT,
  idempotency_key TEXT,
  payload        JSONB NOT NULL,
  processed      BOOLEAN DEFAULT FALSE,
  processed_at   TIMESTAMPTZ,
  error          TEXT
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON public.stripe_webhook_events(type);

CREATE INDEX IF NOT EXISTS idx_stripe_events_idempotency
  ON public.stripe_webhook_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed
  ON public.stripe_webhook_events(processed, created_at)
  WHERE processed = FALSE;

-- RLS policies for service_role access
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON public.stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.stripe_webhook_events IS 'Stripe Webhook events for deduplication, self-healing, and audit trail';
COMMENT ON COLUMN public.stripe_webhook_events.event_id IS 'Stripe Event ID (unique, used for deduplication)';
COMMENT ON COLUMN public.stripe_webhook_events.type IS 'Stripe Event type (e.g., invoice.finalized)';
COMMENT ON COLUMN public.stripe_webhook_events.idempotency_key IS 'Original operation idempotency key for linkage';
COMMENT ON COLUMN public.stripe_webhook_events.processed IS 'Whether the event has been processed successfully';
COMMENT ON COLUMN public.stripe_webhook_events.error IS 'Error message if processing failed (for retry)';
