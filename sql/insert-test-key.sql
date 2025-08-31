-- Insert test API key for testing v1_filings endpoint
-- Run this in Supabase SQL Editor

-- First, make sure the tables exist
-- If not, run complete-schema.sql first

-- Delete existing test key if exists
DELETE FROM public.api_keys 
WHERE user_id = 'test_user_123' 
AND name = 'Test API Key';

-- Insert test API key
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
  'test_user_123',
  'xbrl_live',
  -- HMAC-SHA256 hash calculated with KEY_PEPPER=37s4DQwo0C0rtwxypynFpVgTq5Wvg/jMpX2o6qGHHK8=
  '550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8',
  'abcd',
  'xbrl_live_0123****abcd',
  true,
  now() + interval '1 year',
  100,
  10000,
  100000
);

-- Verify insertion
SELECT 
  name,
  user_id,
  key_prefix,
  substring(key_hash, 1, 10) || '...' as key_hash_preview,
  masked_key,
  is_active,
  expires_at
FROM public.api_keys 
WHERE user_id = 'test_user_123';

-- Test API key value (use this in your API calls):
-- xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd