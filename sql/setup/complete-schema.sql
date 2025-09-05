-- Complete database schema for API key management
-- wpwqxhyiglbtlaimrjrx project

-- 1. Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_suffix TEXT,
  masked_key TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  rate_limit_per_minute INTEGER DEFAULT 100,
  rate_limit_per_hour INTEGER DEFAULT 10000,
  rate_limit_per_day INTEGER DEFAULT 100000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create api_usage table for rate limiting
CREATE TABLE IF NOT EXISTS public.api_usage (
  key_id TEXT PRIMARY KEY,
  minute_window TIMESTAMP WITH TIME ZONE NOT NULL,
  hour_window TIMESTAMP WITH TIME ZONE NOT NULL,
  day_window TIMESTAMP WITH TIME ZONE NOT NULL,
  minute_count BIGINT DEFAULT 0,
  hour_count BIGINT DEFAULT 0,
  day_count BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix_hash 
ON public.api_keys(key_prefix, key_hash);

-- 4. Create index on user_id
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id 
ON public.api_keys(user_id);

-- 5. Create index on is_active
CREATE INDEX IF NOT EXISTS idx_api_keys_active 
ON public.api_keys(is_active);

-- 6. Drop existing function if exists
DROP FUNCTION IF EXISTS incr_usage_and_get(text);

-- 7. Create atomic increment function for rate limiting
CREATE OR REPLACE FUNCTION incr_usage_and_get(p_key_id text)
RETURNS TABLE (
  minute_count bigint,
  hour_count bigint,
  day_count bigint
) AS $$
BEGIN
  -- Upsert and increment counters
  INSERT INTO public.api_usage (
    key_id,
    minute_window,
    hour_window,
    day_window,
    minute_count,
    hour_count,
    day_count
  ) VALUES (
    p_key_id,
    date_trunc('minute', now()),
    date_trunc('hour', now()),
    date_trunc('day', now()),
    1,
    1,
    1
  )
  ON CONFLICT (key_id) DO UPDATE SET
    minute_count = CASE 
      WHEN api_usage.minute_window = date_trunc('minute', now()) 
      THEN api_usage.minute_count + 1 
      ELSE 1 
    END,
    hour_count = CASE 
      WHEN api_usage.hour_window = date_trunc('hour', now()) 
      THEN api_usage.hour_count + 1 
      ELSE 1 
    END,
    day_count = CASE 
      WHEN api_usage.day_window = date_trunc('day', now()) 
      THEN api_usage.day_count + 1 
      ELSE 1 
    END,
    minute_window = date_trunc('minute', now()),
    hour_window = date_trunc('hour', now()),
    day_window = date_trunc('day', now()),
    updated_at = now();

  -- Return current counts
  RETURN QUERY
  SELECT 
    api_usage.minute_count,
    api_usage.hour_count,
    api_usage.day_count
  FROM public.api_usage
  WHERE key_id = p_key_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for api_keys
CREATE POLICY "Service role can manage all keys" ON public.api_keys
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own keys" ON public.api_keys
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- 10. Create RLS policies for api_usage
CREATE POLICY "Service role can manage all usage" ON public.api_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- 11. Grant necessary permissions
GRANT ALL ON public.api_keys TO service_role;
GRANT ALL ON public.api_usage TO service_role;
GRANT SELECT ON public.api_keys TO authenticated;
GRANT SELECT ON public.api_usage TO authenticated;

-- 12. Test data insertion (optional)
-- INSERT INTO public.api_keys (
--   name,
--   user_id,
--   key_prefix,
--   key_hash,
--   key_suffix,
--   masked_key,
--   is_active,
--   expires_at
-- ) VALUES (
--   'Test API Key',
--   'test_user_123',
--   'xbrl_live',
--   'test_hash_value',
--   'abcd',
--   'xbrl_live_****abcd',
--   true,
--   now() + interval '1 year'
-- );

-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_keys', 'api_usage');

-- Verify function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'incr_usage_and_get';