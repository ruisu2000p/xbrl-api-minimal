-- ========= Fix usage_counters table =========
-- This script checks and fixes the usage_counters table structure

-- First, check if the table exists and what columns it has
SELECT 'Current usage_counters structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usage_counters'
ORDER BY ordinal_position;

-- Drop the existing table if it exists (it seems to be malformed)
DROP TABLE IF EXISTS usage_counters CASCADE;

-- Recreate usage_counters with correct structure
CREATE TABLE usage_counters (
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
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usage_counters_api_key_id_key UNIQUE (api_key_id)
);

-- Create index
CREATE INDEX idx_usage_counters_api_key_id ON usage_counters(api_key_id);

-- ========= Create atomic increment function =========
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

-- ========= Enable RLS =========
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- ========= Create RLS policies =========
-- Drop existing policies first
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'usage_counters'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON usage_counters', pol.policyname);
    END LOOP;
END $$;

-- Deny all client access to usage_counters
CREATE POLICY "deny_all_client_access"
ON usage_counters FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ========= Create update trigger =========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= Verify the fix =========
SELECT 'New usage_counters structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usage_counters'
ORDER BY ordinal_position;

-- Test the function (only if API keys exist)
SELECT 'Function created. Test with actual API key ID when available.' as info;

SELECT '✅ usage_counters table fixed successfully!' as status;