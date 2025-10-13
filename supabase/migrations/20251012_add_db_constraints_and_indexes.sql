-- Add UNIQUE constraints and indexes for data integrity and performance

-- =============================================================================
-- 1. user_subscriptions: Ensure one subscription per user
-- =============================================================================

-- Add UNIQUE constraint on user_id (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_subscriptions_user_id_key'
    AND conrelid = 'private.user_subscriptions'::regclass
  ) THEN
    ALTER TABLE private.user_subscriptions
      ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add UNIQUE index on stripe_subscription_id (where not null)
CREATE UNIQUE INDEX IF NOT EXISTS uq_stripe_subscription_id
  ON private.user_subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Add index on stripe_customer_id for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_subs_customer
  ON private.user_subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Add index on status for filtering active subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subs_status
  ON private.user_subscriptions(status);

-- =============================================================================
-- 2. invoices: Ensure unique invoice records
-- =============================================================================

-- Add UNIQUE constraint on stripe_invoice_id (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_stripe_invoice_id_key'
    AND conrelid = 'private.invoices'::regclass
  ) THEN
    ALTER TABLE private.invoices
      ADD CONSTRAINT invoices_stripe_invoice_id_key UNIQUE (stripe_invoice_id);
  END IF;
END $$;

-- Index already exists from previous migration (idx_invoices_stripe_invoice_id)
-- Add compound index for user + status queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_status
  ON private.invoices(user_id, status);

-- =============================================================================
-- 3. api_keys: Ensure unique key identifiers
-- =============================================================================

-- Add UNIQUE index on key_hash (encrypted keys should be unique)
CREATE UNIQUE INDEX IF NOT EXISTS uq_api_key_hash
  ON private.api_keys(key_hash)
  WHERE is_active = TRUE;

-- Index on user_id + is_active for listing active keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active
  ON private.api_keys(user_id, is_active);

-- =============================================================================
-- 4. stripe_events: Already has PRIMARY KEY on id (event ID)
-- =============================================================================
-- No additional constraints needed

-- =============================================================================
-- Comments for documentation
-- =============================================================================
COMMENT ON CONSTRAINT user_subscriptions_user_id_key ON private.user_subscriptions IS
  'Ensures one subscription record per user';

COMMENT ON INDEX uq_stripe_subscription_id IS
  'Ensures Stripe subscription IDs are unique across all user subscriptions';

COMMENT ON INDEX idx_user_subs_customer IS
  'Speeds up webhook lookups by Stripe customer ID';

COMMENT ON INDEX idx_invoices_user_status IS
  'Optimizes queries for user invoice history filtered by status';

COMMENT ON INDEX uq_api_key_hash IS
  'Prevents duplicate API keys from being created';

COMMENT ON INDEX idx_api_keys_user_active IS
  'Speeds up listing active API keys for a user';
