-- Fix user_id type issue - change from UUID to TEXT
-- Run this in Supabase SQL Editor

-- 1. Drop existing table if it has wrong schema
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.api_usage CASCADE;

-- 2. Recreate api_keys table with user_id as TEXT
CREATE TABLE public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,  -- Changed to TEXT instead of UUID reference
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

-- 3. Create api_usage table
CREATE TABLE public.api_usage (
  key_id TEXT PRIMARY KEY,
  minute_window TIMESTAMP WITH TIME ZONE NOT NULL,
  hour_window TIMESTAMP WITH TIME ZONE NOT NULL,
  day_window TIMESTAMP WITH TIME ZONE NOT NULL,
  minute_count BIGINT DEFAULT 0,
  hour_count BIGINT DEFAULT 0,
  day_count BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create indexes
CREATE INDEX idx_api_keys_prefix_hash ON public.api_keys(key_prefix, key_hash);
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_active ON public.api_keys(is_active);

-- 5. Create or replace the increment function
DROP FUNCTION IF EXISTS incr_usage_and_get(text);

CREATE OR REPLACE FUNCTION incr_usage_and_get(p_key_id text)
RETURNS TABLE (
  minute_count bigint,
  hour_count bigint,
  day_count bigint
) AS $$
BEGIN
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

  RETURN QUERY
  SELECT 
    api_usage.minute_count,
    api_usage.hour_count,
    api_usage.day_count
  FROM public.api_usage
  WHERE key_id = p_key_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
DROP POLICY IF EXISTS "Service role can manage all keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view their own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Service role can manage all usage" ON public.api_usage;

CREATE POLICY "Service role can manage all keys" ON public.api_keys
  FOR ALL
  USING (true); -- Service role bypass RLS

CREATE POLICY "Anon can insert keys" ON public.api_keys
  FOR INSERT
  WITH CHECK (true); -- Allow Edge Functions to insert

CREATE POLICY "Anon can select keys" ON public.api_keys
  FOR SELECT
  USING (true); -- Allow Edge Functions to select

CREATE POLICY "Service role can manage all usage" ON public.api_usage
  FOR ALL
  USING (true);

CREATE POLICY "Anon can manage usage" ON public.api_usage
  FOR ALL
  USING (true); -- Allow Edge Functions to manage usage

-- 8. Grant permissions
GRANT ALL ON public.api_keys TO anon, authenticated, service_role;
GRANT ALL ON public.api_usage TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION incr_usage_and_get(text) TO anon, authenticated, service_role;

-- 9. Insert test API key
INSERT INTO public.api_keys (
  name,
  user_id,
  key_prefix,
  key_hash,
  key_suffix,
  masked_key,
  is_active,
  expires_at,
  rate_limit_per_minute,
  rate_limit_per_hour,
  rate_limit_per_day
) VALUES (
  'Test API Key',
  'test_user_123',  -- Now this works as TEXT
  'xbrl_live',
  '550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8',
  'abcd',
  'xbrl_live_0123****abcd',
  true,
  now() + interval '1 year',
  100,
  10000,
  100000
);

-- 10. Verify everything is created correctly
SELECT 
  'Tables created:' as status,
  count(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_keys', 'api_usage')
UNION ALL
SELECT 
  'Test key inserted:' as status,
  count(*) as count
FROM public.api_keys
WHERE user_id = 'test_user_123';

-- Test API key to use:
-- xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd