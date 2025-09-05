-- ========= Optimized Security Patch for Current Schema =========
-- This script is optimized for your current table structure

-- ========= 1) Ensure usage_counters table exists =========
CREATE TABLE IF NOT EXISTS usage_counters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  minute_count integer DEFAULT 0,
  hour_count integer DEFAULT 0,
  day_count integer DEFAULT 0,
  total_count bigint DEFAULT 0,
  last_reset_minute timestamp with time zone DEFAULT now(),
  last_reset_hour timestamp with time zone DEFAULT now(),
  last_reset_day timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add unique constraint for api_key_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'usage_counters_api_key_id_key'
    ) THEN
        ALTER TABLE usage_counters 
        ADD CONSTRAINT usage_counters_api_key_id_key UNIQUE (api_key_id);
    END IF;
END $$;

-- ========= 2) Create atomic increment function =========
CREATE OR REPLACE FUNCTION incr_usage_and_get(p_key_id uuid)
RETURNS TABLE(minute_count int, hour_count int, day_count int) LANGUAGE plpgsql AS $$
DECLARE
  now_ts timestamptz := now();
  this_min timestamptz := date_trunc('minute', now_ts);
  this_hour timestamptz := date_trunc('hour', now_ts);
  this_day  timestamptz := date_trunc('day', now_ts);
BEGIN
  -- Insert or update with atomic reset logic
  INSERT INTO usage_counters (
    api_key_id, minute_count, hour_count, day_count, total_count,
    last_reset_minute, last_reset_hour, last_reset_day, created_at, updated_at
  )
  VALUES (
    p_key_id, 1, 1, 1, 1,
    this_min, this_hour, this_day, now_ts, now_ts
  )
  ON CONFLICT (api_key_id) DO UPDATE SET
    -- Reset counters if time boundaries have passed
    minute_count = CASE 
      WHEN usage_counters.last_reset_minute < this_min THEN 1 
      ELSE usage_counters.minute_count + 1 
    END,
    hour_count = CASE 
      WHEN usage_counters.last_reset_hour < this_hour THEN 1 
      ELSE usage_counters.hour_count + 1 
    END,
    day_count = CASE 
      WHEN usage_counters.last_reset_day < this_day THEN 1 
      ELSE usage_counters.day_count + 1 
    END,
    total_count = usage_counters.total_count + 1,
    -- Update reset timestamps
    last_reset_minute = CASE 
      WHEN usage_counters.last_reset_minute < this_min THEN this_min 
      ELSE usage_counters.last_reset_minute 
    END,
    last_reset_hour = CASE 
      WHEN usage_counters.last_reset_hour < this_hour THEN this_hour 
      ELSE usage_counters.last_reset_hour 
    END,
    last_reset_day = CASE 
      WHEN usage_counters.last_reset_day < this_day THEN this_day 
      ELSE usage_counters.last_reset_day 
    END,
    updated_at = now_ts;

  -- Return the current counts
  RETURN QUERY
  SELECT uc.minute_count, uc.hour_count, uc.day_count
  FROM usage_counters uc
  WHERE uc.api_key_id = p_key_id;
END;
$$;

-- ========= 3) Create indexes for performance =========
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_keyhash_unique ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_usage_counters_api_key_id ON usage_counters(api_key_id);

-- ========= 4) Add check constraints =========
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

-- ========= 5) Enable RLS =========
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- ========= 6) Clean up old policies =========
-- Drop all existing policies to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on api_keys
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'api_keys'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON api_keys', pol.policyname);
    END LOOP;
    
    -- Drop all policies on usage_counters
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'usage_counters'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON usage_counters', pol.policyname);
    END LOOP;
END $$;

-- ========= 7) Create new RLS policies =========
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

-- Deny all client access to usage_counters
CREATE POLICY "deny_all_client_access"
ON usage_counters FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ========= 8) Create update triggers =========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create or replace triggers
DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= 9) Verification queries =========
-- Check table structures
SELECT 'API Keys table has ' || count(*) || ' columns' as status
FROM information_schema.columns
WHERE table_name = 'api_keys';

SELECT 'Usage Counters table has ' || count(*) || ' columns' as status
FROM information_schema.columns
WHERE table_name = 'usage_counters';

-- Check RLS status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status
FROM pg_tables 
WHERE tablename IN ('api_keys', 'usage_counters');

-- Check policies
SELECT 
  tablename,
  count(*) as policy_count
FROM pg_policies
WHERE tablename IN ('api_keys', 'usage_counters')
GROUP BY tablename;

-- Final status
SELECT '🎉 Security patch applied successfully!' as status;