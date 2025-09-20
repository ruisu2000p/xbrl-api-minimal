-- Migration: Security Upgrade - Phase 1
-- Purpose: Add new security columns and tables for HMAC-SHA256 migration

-- 1. Add security columns to api_keys table (if not exists)
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS salt TEXT,
ADD COLUMN IF NOT EXISTS hash_method VARCHAR(20) DEFAULT 'base64' NOT NULL,
ADD COLUMN IF NOT EXISTS migration_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS security_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_security_audit TIMESTAMP WITH TIME ZONE;

-- 2. Create security_events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN (
      'auth_success',
      'auth_failure',
      'rate_limit_exceeded',
      'suspicious_activity',
      'key_migration',
      'security_audit'
    )
  ),
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_api_key
  ON security_events(api_key_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity
  ON security_events(severity)
  WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_method
  ON api_keys(hash_method);
CREATE INDEX IF NOT EXISTS idx_api_keys_migration_status
  ON api_keys(migration_status)
  WHERE migration_status != 'completed';

-- 4. Create function for API key usage increment
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  key_id UUID,
  ts TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = ts
  WHERE id = key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create migration progress view
CREATE OR REPLACE VIEW migration_progress AS
SELECT
  hash_method,
  migration_status,
  COUNT(*) as key_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM api_keys
GROUP BY hash_method, migration_status
ORDER BY hash_method, migration_status;

-- 6. Create security dashboard view
CREATE OR REPLACE VIEW security_dashboard AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  event_type,
  severity,
  COUNT(*) as event_count
FROM security_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, event_type, severity
ORDER BY hour DESC, severity DESC;

-- 7. Add rate limit violations table
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  attempted_requests INTEGER NOT NULL,
  limit_threshold INTEGER NOT NULL,
  violation_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_api_key
  ON rate_limit_violations(api_key_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_time
  ON rate_limit_violations(violation_time DESC);

-- 8. Update existing API keys to prepare for migration
UPDATE api_keys
SET
  hash_method = CASE
    WHEN LENGTH(key_hash) < 50 THEN 'base64'
    ELSE 'sha256-base64'
  END,
  migration_status = 'pending',
  security_version = 1
WHERE hash_method IS NULL;

-- 9. Add comment for documentation
COMMENT ON TABLE security_events IS 'Audit log for all security-related events';
COMMENT ON TABLE rate_limit_violations IS 'Track rate limit violations for security monitoring';
COMMENT ON VIEW migration_progress IS 'Monitor API key migration progress from legacy to HMAC-SHA256';
COMMENT ON VIEW security_dashboard IS 'Real-time security monitoring dashboard data';