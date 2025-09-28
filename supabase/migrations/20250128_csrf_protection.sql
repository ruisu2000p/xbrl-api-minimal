-- CSRF Token Storage Table
CREATE TABLE IF NOT EXISTS csrf_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT csrf_tokens_session_id_unique UNIQUE (session_id)
);

-- Rate Limit Logs Table
CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_rate_limit_identifier (identifier),
    INDEX idx_rate_limit_created_at (created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_session_id ON csrf_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON csrf_tokens(expires_at);

-- RLS Policies
ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage CSRF tokens
CREATE POLICY "Service role manages CSRF tokens" ON csrf_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Only service role can manage rate limit logs
CREATE POLICY "Service role manages rate limit logs" ON rate_limit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Cleanup function for expired data
CREATE OR REPLACE FUNCTION cleanup_expired_security_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete expired CSRF tokens
    DELETE FROM csrf_tokens WHERE expires_at < NOW();

    -- Delete old rate limit logs (older than 1 hour)
    DELETE FROM rate_limit_logs WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Create a scheduled job to run cleanup every hour
-- Note: This requires pg_cron extension to be enabled
-- You can also run this manually or via a serverless function
SELECT cron.schedule(
    'cleanup-expired-security-data',
    '0 * * * *', -- Every hour
    'SELECT cleanup_expired_security_data();'
) WHERE EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
);