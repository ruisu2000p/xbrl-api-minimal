-- Add Stripe tracking columns to account_deletions for reconciliation and audit
--
-- Purpose: Store Stripe entity IDs for traceability and reconciliation
-- - stripe_invoice_id: Final invoice generated at cancellation
-- - stripe_credit_note_id: Credit note used for refund/credit
-- - stripe_refund_amount: Actual refund/credit amount (matches audit_logs.details.refund_amount)
--
-- Benefits:
-- 1. Direct Stripe API lookup for reconciliation
-- 2. Daily reconciliation queries can match DB vs Stripe
-- 3. Webhook events can be linked via event.request.idempotency_key

ALTER TABLE account_deletions
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_credit_note_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_amount BIGINT DEFAULT 0;

COMMENT ON COLUMN account_deletions.stripe_invoice_id IS 'Stripe Invoice ID (final invoice from subscription cancellation)';
COMMENT ON COLUMN account_deletions.stripe_credit_note_id IS 'Stripe Credit Note ID (refund or credit)';
COMMENT ON COLUMN account_deletions.stripe_refund_amount IS 'Refund/credit amount in smallest currency unit (e.g., cents for USD, yen for JPY)';

-- Index for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_account_deletions_stripe_credit_note
  ON account_deletions(stripe_credit_note_id)
  WHERE stripe_credit_note_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_deletions_stripe_invoice
  ON account_deletions(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
