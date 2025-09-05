-- ========= Setup RLS Policies (After fixing usage_counters) =========
-- Run this AFTER fix-usage-counters.sql

-- ========= 1) Enable RLS on api_keys =========
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ========= 2) Clean up old policies on api_keys =========
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'api_keys'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON api_keys', pol.policyname);
    END LOOP;
END $$;

-- ========= 3) Create new RLS policies for api_keys =========
-- Users can only read their own API keys
CREATE POLICY "users_read_own_keys"
ON api_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Prevent client-side INSERT
CREATE POLICY "deny_client_insert"
ON api_keys FOR INSERT
TO authenticated
WITH CHECK (false);

-- Prevent client-side UPDATE
CREATE POLICY "deny_client_update"
ON api_keys FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Prevent client-side DELETE
CREATE POLICY "deny_client_delete"
ON api_keys FOR DELETE
TO authenticated
USING (false);

-- ========= 4) Create performance indexes =========
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_keyhash_unique ON api_keys(key_hash);

-- ========= 5) Add check constraints =========
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_rate_limits_nonneg'
    ) THEN
        ALTER TABLE api_keys
        ADD CONSTRAINT chk_rate_limits_nonneg
        CHECK (rate_limit_per_minute >= 0 AND rate_limit_per_hour >= 0 AND rate_limit_per_day >= 0);
    END IF;
END $$;

-- ========= 6) Create or replace the update function =========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ========= 7) Create update trigger for api_keys =========
DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= 8) Verification =========
-- Check RLS status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status
FROM pg_tables 
WHERE tablename IN ('api_keys', 'usage_counters');

-- Check policies
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('api_keys', 'usage_counters')
ORDER BY tablename, policyname;

-- Check indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('api_keys', 'usage_counters')
ORDER BY tablename, indexname;

SELECT '🎉 RLS policies setup completed!' as status;