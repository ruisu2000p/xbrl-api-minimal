-- Simple insert test key only (use when table structure is correct)
-- Run this if api_keys table exists with correct structure

-- 1. Delete any existing test key
DELETE FROM public.api_keys 
WHERE user_id = 'test_user_123';

-- 2. Insert test API key
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
  '550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8',
  'abcd',
  'xbrl_live_0123****abcd',
  true,
  now() + interval '1 year',
  100,
  10000,
  100000
);

-- 3. Verify insertion
SELECT 
  id,
  name,
  user_id,
  key_prefix,
  substring(key_hash, 1, 20) || '...' as key_hash_preview,
  masked_key,
  is_active,
  expires_at
FROM public.api_keys
WHERE user_id = 'test_user_123';

-- Test API key to use:
-- xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd