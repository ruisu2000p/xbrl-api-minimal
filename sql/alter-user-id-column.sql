-- Alter existing api_keys table to change user_id from UUID to TEXT
-- Use this if table exists but user_id is UUID type

-- 1. Check current user_id type
SELECT 
  column_name,
  data_type,
  'Current type' as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'api_keys'
AND column_name = 'user_id';

-- 2. Backup existing data (if any)
CREATE TEMP TABLE api_keys_backup AS
SELECT * FROM public.api_keys;

-- 3. Drop constraints and indexes that depend on user_id
DROP INDEX IF EXISTS idx_api_keys_user_id;

-- 4. Alter column type to TEXT
ALTER TABLE public.api_keys 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 5. Recreate index
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);

-- 6. Verify the change
SELECT 
  column_name,
  data_type,
  'After change' as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'api_keys'
AND column_name = 'user_id';

-- 7. Now insert test API key
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
  'test_user_123',  -- Now works with TEXT
  'xbrl_live',
  '550b044b9e23137984aaf190f05117091b725432c37ee8eddbcc165663490fd8',
  'abcd',
  'xbrl_live_0123****abcd',
  true,
  now() + interval '1 year',
  100,
  10000,
  100000
) ON CONFLICT DO NOTHING;

-- 8. Verify insertion
SELECT 
  name,
  user_id,
  key_prefix,
  substring(key_hash, 1, 10) || '...' as key_hash_preview,
  is_active
FROM public.api_keys
WHERE user_id = 'test_user_123';

-- Test API key to use:
-- xbrl_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd