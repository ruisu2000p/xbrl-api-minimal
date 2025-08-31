-- Debug API key lookup
-- Check what's in the database and what the function expects

-- 1. Show the test key details
SELECT 
  id,
  name,
  user_id,
  key_prefix,
  key_hash,
  key_suffix,
  masked_key,
  is_active,
  expires_at
FROM public.api_keys
WHERE user_id = 'test_user_123';

-- 2. Test the lookup that the Edge Function would do
-- The Edge Function extracts prefix as: key.split("_")[0] + "_" + key.split("_")[1]
-- For key: xbrl_live_0123456789abcdef...
-- Prefix should be: xbrl_live

SELECT 
  id,
  user_id,
  is_active,
  rate_limit_per_minute,
  rate_limit_per_hour,
  rate_limit_per_day,
  expires_at
FROM public.api_keys
WHERE key_prefix = 'xbrl_live'
AND key_hash = '550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8'
AND is_active = true;

-- 3. Check if there are any issues with the hash
SELECT 
  'Expected hash' as type,
  '550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8' as value
UNION ALL
SELECT 
  'Stored hash' as type,
  key_hash as value
FROM public.api_keys
WHERE user_id = 'test_user_123'
LIMIT 1;

-- 4. Check RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'api_keys';

-- 5. Test without exact hash match (to see if record exists)
SELECT 
  count(*) as matching_records,
  'With exact hash' as condition
FROM public.api_keys
WHERE key_prefix = 'xbrl_live'
AND key_hash = '550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8'
UNION ALL
SELECT 
  count(*) as matching_records,
  'With prefix only' as condition
FROM public.api_keys
WHERE key_prefix = 'xbrl_live'
UNION ALL
SELECT 
  count(*) as matching_records,
  'All active keys' as condition
FROM public.api_keys
WHERE is_active = true;