-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_rate_limit_key ON rate_limit_entries(key);
CREATE INDEX idx_rate_limit_window ON rate_limit_entries(window_start, window_end);
CREATE INDEX idx_rate_limit_key_window ON rate_limit_entries(key, window_start);

-- Cleanup function for old entries
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_entries
  WHERE window_end < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Scheduled cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_old_rate_limit_entries();');