-- Rename stripe_credit_note_id to stripe_refund_id for account_deletions table
-- This reflects the change from using credit notes to direct refunds

ALTER TABLE public.account_deletions
  RENAME COLUMN stripe_credit_note_id TO stripe_refund_id;

COMMENT ON COLUMN public.account_deletions.stripe_refund_id IS 'Stripe refund ID for prorated subscription refund';
