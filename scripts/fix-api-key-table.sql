-- api_keysテーブルの構造を確認・修正するSQL

-- 1. 現在のテーブル構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 2. 必要なカラムがない場合は追加
-- revokedカラムを追加（存在しない場合）
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false;

-- scopesカラムを追加（存在しない場合）
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS scopes TEXT[] DEFAULT ARRAY['read:markdown'];

-- nameカラムを追加（存在しない場合）  
ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS name TEXT;

-- 3. あなたのAPIキーを登録（修正版）
INSERT INTO public.api_keys (
  id,
  user_id,
  name,
  key_prefix,
  key_hash,
  scopes,
  revoked,
  created_at,
  expires_at
) VALUES (
  gen_random_uuid(),
  COALESCE(
    (SELECT id FROM auth.users WHERE email = 'admin@xbrl-api.com' LIMIT 1),
    'a0000000-0000-0000-0000-000000000001'::uuid
  ),
  'Claude Desktop API Key',
  'xbrl_live_oLk1j9',
  'Y6T0ZoihCgvSWe1O8ceqTYeyzr565coiwvy1wXAYrFg=',
  ARRAY['read:markdown'],
  false,
  now(),
  now() + interval '1 year'
) ON CONFLICT (key_hash) DO UPDATE
  SET name = EXCLUDED.name,
      scopes = EXCLUDED.scopes;

-- 4. 確認
SELECT 
  id,
  name,
  key_prefix,
  scopes,
  revoked,
  created_at
FROM api_keys
WHERE key_prefix = 'xbrl_live_oLk1j9';