-- ========= Complete Setup Script =========
-- Run this script in order to set up all required tables and functions

-- ========= STEP 1: Add missing columns to api_keys =========
-- Check and add rate_limit_per_minute
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'rate_limit_per_minute') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_minute INTEGER DEFAULT 100;
    END IF;
END $$;

-- Check and add rate_limit_per_hour
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'rate_limit_per_hour') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_hour INTEGER DEFAULT 10000;
    END IF;
END $$;

-- Check and add rate_limit_per_day
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'rate_limit_per_day') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_day INTEGER DEFAULT 100000;
    END IF;
END $$;

-- Check and add key_suffix if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'key_suffix') THEN
        ALTER TABLE api_keys ADD COLUMN key_suffix TEXT;
    END IF;
END $$;

-- Check and add masked_key if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'masked_key') THEN
        ALTER TABLE api_keys ADD COLUMN masked_key TEXT;
    END IF;
END $$;

-- Check and add updated_at if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE api_keys ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- ========= STEP 2: Ensure usage_counters exists =========
-- Create usage_counters table if it doesn't exist
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

-- ========= STEP 3: Apply enhanced security settings =========

-- Make user_id NOT NULL (only if all existing records have user_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM api_keys WHERE user_id IS NULL) THEN
        ALTER TABLE api_keys ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Add unique constraint for api_key_id in usage_counters
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_keyhash_unique ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_usage_counters_api_key_id ON usage_counters(api_key_id);

-- Add check constraint for rate limits
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

-- ========= STEP 4: Create the atomic increment function =========
CREATE OR REPLACE FUNCTION incr_usage_and_get(p_key_id uuid)
RETURNS TABLE(minute_count int, hour_count int, day_count int) LANGUAGE plpgsql AS $$
DECLARE
  now_ts timestamptz := now();
  this_min timestamptz := date_trunc('minute', now_ts);
  this_hour timestamptz := date_trunc('hour', now_ts);
  this_day  timestamptz := date_trunc('day', now_ts);
BEGIN
  -- First, try to insert a new record if it doesn't exist
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

-- ========= STEP 5: Set up RLS policies =========

-- Enable RLS on tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can create their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
DROP POLICY IF EXISTS "users_read_own_keys" ON api_keys;
DROP POLICY IF EXISTS "deny client write keys" ON api_keys;
DROP POLICY IF EXISTS "Service role can access all API keys" ON api_keys;
DROP POLICY IF EXISTS "Service role can access all usage counters" ON usage_counters;
DROP POLICY IF EXISTS "deny client write usage" ON usage_counters;

-- Create new policies for api_keys
CREATE POLICY "users_read_own_keys"
ON api_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Deny all write operations from clients (only service role can write)
CREATE POLICY "deny_client_insert"
ON api_keys FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "deny_client_update"
ON api_keys FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "deny_client_delete"
ON api_keys FOR DELETE
TO authenticated
USING (false);

-- Deny all client operations on usage_counters
CREATE POLICY "deny_all_client_access"
ON usage_counters FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ========= STEP 6: Create update trigger =========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= STEP 7: Verify setup =========
-- Check api_keys columns
SELECT 
  'api_keys table structure:' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;

-- Check usage_counters columns
SELECT 
  'usage_counters table structure:' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'usage_counters'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT 
  'RLS Status:' as info,
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('api_keys', 'usage_counters');

-- Success message
SELECT 'Setup completed successfully!' as status;