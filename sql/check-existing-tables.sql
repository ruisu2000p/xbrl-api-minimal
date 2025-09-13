-- Check existing tables and their structures
-- Run this FIRST in Supabase SQL Editor to see what already exists

-- 1. Check if api_keys table exists and its structure
SELECT 
  'api_keys table' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'api_keys'
  ) as exists;

-- 2. Check if api_usage table exists
SELECT 
  'api_usage table' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'api_usage'
  ) as exists;

-- 3. If api_keys exists, show its columns and types
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 4. If api_usage exists, show its columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'api_usage'
ORDER BY ordinal_position;

-- 5. Check if incr_usage_and_get function exists
SELECT 
  'incr_usage_and_get function' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'incr_usage_and_get'
  ) as exists;

-- 6. Check existing data in api_keys
SELECT 
  'Existing API keys:' as info,
  count(*) as count
FROM public.api_keys;

-- 7. Show sample of existing keys (if any)
SELECT 
  id,
  name,
  user_id,
  key_prefix,
  substring(key_hash, 1, 10) || '...' as key_hash_preview,
  is_active,
  created_at
FROM public.api_keys
LIMIT 5;

-- 8. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('api_keys', 'api_usage');