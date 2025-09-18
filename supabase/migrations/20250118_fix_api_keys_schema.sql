-- Fix api_keys table schema to match application requirements

-- Add missing columns if they don't exist
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS salt VARCHAR(255),
ADD COLUMN IF NOT EXISTS hash_method VARCHAR(50) DEFAULT 'hmac-sha256',
ADD COLUMN IF NOT EXISTS migration_status VARCHAR(50) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS security_version INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS last_security_audit TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS key_suffix VARCHAR(10),
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Update existing records to have proper defaults
UPDATE api_keys
SET
  hash_method = COALESCE(hash_method, 'hmac-sha256'),
  migration_status = COALESCE(migration_status, 'completed'),
  security_version = COALESCE(security_version, 2),
  usage_count = COALESCE(usage_count, 0)
WHERE hash_method IS NULL OR migration_status IS NULL OR security_version IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_method ON api_keys(hash_method);
CREATE INDEX IF NOT EXISTS idx_api_keys_migration_status ON api_keys(migration_status);

-- Add RPC function for incrementing usage if it doesn't exist
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_id UUID, timestamp TIMESTAMP WITH TIME ZONE)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET
    usage_count = usage_count + 1,
    last_used_at = timestamp
  WHERE id = key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'low',
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_api_key ON security_events(api_key_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

COMMENT ON COLUMN api_keys.salt IS 'Salt for HMAC hashing';
COMMENT ON COLUMN api_keys.hash_method IS 'Hashing method: base64, sha256-base64, or hmac-sha256';
COMMENT ON COLUMN api_keys.migration_status IS 'Migration status: pending, in_progress, or completed';
COMMENT ON COLUMN api_keys.security_version IS 'Security version: 1 (legacy) or 2 (current)';