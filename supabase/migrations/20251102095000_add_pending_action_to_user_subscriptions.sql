-- Add pending_action column for tracking async operations
-- This column tracks operations that are waiting for webhook confirmation

ALTER TABLE private.user_subscriptions
ADD COLUMN IF NOT EXISTS pending_action TEXT;

-- Create index for monitoring pending actions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_pending_action_monitoring
ON private.user_subscriptions(pending_action, updated_at)
WHERE pending_action IS NOT NULL;

-- Comment on column
COMMENT ON COLUMN private.user_subscriptions.pending_action IS 'Pending operation awaiting webhook confirmation: downgrade_to_freemium | cancel_immediate | null';
