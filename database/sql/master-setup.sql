-- ============================================
-- Master Setup Script for XBRL API
-- ============================================
-- This is the consolidated setup script that combines all necessary
-- components for a complete production deployment.
--
-- Run this script in Supabase SQL Editor for initial setup.
-- ============================================

-- ============================================
-- 1. CORE TABLES SETUP
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (if not exists)
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    ticker_code TEXT,
    company_name TEXT NOT NULL,
    directory_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ticker_code lookups
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker_code);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);

-- ============================================
-- 2. AUTHENTICATION & API KEYS
-- ============================================

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
    tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- ============================================
-- 3. RATE LIMITING
-- ============================================

-- Rate limits table
CREATE TABLE IF NOT EXISTS api_key_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    requests_per_hour INTEGER DEFAULT 100,
    requests_per_day INTEGER DEFAULT 1000,
    requests_per_month INTEGER DEFAULT 10000,
    current_hour_count INTEGER DEFAULT 0,
    current_day_count INTEGER DEFAULT 0,
    current_month_count INTEGER DEFAULT 0,
    last_hour_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_day_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_month_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(api_key_id)
);

-- ============================================
-- 4. USAGE TRACKING
-- ============================================

-- Usage logs table
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    request_body JSONB,
    response_body JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for usage analysis
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON api_key_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint ON api_key_usage_logs(endpoint);

-- ============================================
-- 5. MARKDOWN METADATA
-- ============================================

-- Markdown files metadata table
CREATE TABLE IF NOT EXISTS markdown_files_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT REFERENCES companies(id),
    fiscal_year TEXT,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    storage_bucket TEXT DEFAULT 'markdown-files',
    storage_path TEXT,
    doc_category TEXT CHECK (doc_category IN ('public', 'audit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for markdown file lookups
CREATE INDEX IF NOT EXISTS idx_markdown_company ON markdown_files_metadata(company_id);
CREATE INDEX IF NOT EXISTS idx_markdown_fiscal ON markdown_files_metadata(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_markdown_category ON markdown_files_metadata(doc_category);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE markdown_files_metadata ENABLE ROW LEVEL SECURITY;

-- Companies: Public read access
CREATE POLICY "Enable read access for all users" ON companies
    FOR SELECT
    USING (true);

-- API Keys: Users can only see their own keys
CREATE POLICY "Users can view own API keys" ON api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys" ON api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON api_keys
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON api_keys
    FOR DELETE
    USING (auth.uid() = user_id);

-- Rate Limits: Access via API key ownership
CREATE POLICY "Users can view own rate limits" ON api_key_rate_limits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM api_keys
            WHERE api_keys.id = api_key_rate_limits.api_key_id
            AND api_keys.user_id = auth.uid()
        )
    );

-- Usage Logs: Access via API key ownership
CREATE POLICY "Users can view own usage logs" ON api_key_usage_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM api_keys
            WHERE api_keys.id = api_key_usage_logs.api_key_id
            AND api_keys.user_id = auth.uid()
        )
    );

-- Markdown Metadata: Public read access
CREATE POLICY "Enable read access for all users" ON markdown_files_metadata
    FOR SELECT
    USING (true);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON api_key_rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_markdown_metadata_updated_at BEFORE UPDATE ON markdown_files_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. VIEWS FOR EASIER QUERYING
-- ============================================

-- API key usage summary view
CREATE OR REPLACE VIEW api_key_usage_summary AS
SELECT 
    ak.id,
    ak.name,
    ak.tier,
    ak.status,
    ak.total_requests,
    ak.successful_requests,
    ak.failed_requests,
    arl.requests_per_hour,
    arl.requests_per_day,
    arl.requests_per_month,
    arl.current_hour_count,
    arl.current_day_count,
    arl.current_month_count
FROM api_keys ak
LEFT JOIN api_key_rate_limits arl ON ak.id = arl.api_key_id;

-- Company document summary view
CREATE OR REPLACE VIEW company_documents_summary AS
SELECT 
    c.id,
    c.company_name,
    c.ticker_code,
    mfm.fiscal_year,
    COUNT(mfm.id) as total_files,
    SUM(mfm.file_size) as total_size,
    MIN(mfm.created_at) as first_upload,
    MAX(mfm.created_at) as last_upload
FROM companies c
LEFT JOIN markdown_files_metadata mfm ON c.id = mfm.company_id
GROUP BY c.id, c.company_name, c.ticker_code, mfm.fiscal_year;

-- ============================================
-- 9. INITIAL DATA & CONFIGURATION
-- ============================================

-- Set default tier limits (can be customized)
INSERT INTO api_key_rate_limits (api_key_id, requests_per_hour, requests_per_day, requests_per_month)
SELECT 
    id,
    CASE tier
        WHEN 'free' THEN 100
        WHEN 'basic' THEN 500
        WHEN 'pro' THEN 2000
        WHEN 'enterprise' THEN 10000
    END,
    CASE tier
        WHEN 'free' THEN 1000
        WHEN 'basic' THEN 5000
        WHEN 'pro' THEN 20000
        WHEN 'enterprise' THEN 100000
    END,
    CASE tier
        WHEN 'free' THEN 10000
        WHEN 'basic' THEN 50000
        WHEN 'pro' THEN 200000
        WHEN 'enterprise' THEN 1000000
    END
FROM api_keys
WHERE NOT EXISTS (
    SELECT 1 FROM api_key_rate_limits WHERE api_key_id = api_keys.id
);

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================
-- Run these to verify setup:

-- Check tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE schemaname = 'public';

-- Check indexes
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes WHERE schemaname = 'public';

-- ============================================
-- END OF MASTER SETUP SCRIPT
-- ============================================