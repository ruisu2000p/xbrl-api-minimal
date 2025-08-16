-- あなたが発行したAPIキーをSupabaseに登録するSQL
-- Supabase SQL Editorで実行してください

-- 1. まず、ユーザーを作成（既に存在する場合はスキップ）
-- Supabase Authにユーザーを作成
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@xbrl-api.com',
  crypt('admin2025', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin User"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- 2. あなたが発行したAPIキーを登録
-- APIキー: xbrl_live_oLk1j9lybJQ0QBcLR5VDULvMYL6AGA1w
-- SHA256 (base64): Y6T0ZoihCgvSWe1O8ceqTYeyzr565coiwvy1wXAYrFg=

INSERT INTO public.api_keys (
  id,
  user_id,
  name,
  key_prefix,
  key_hash,
  scopes,
  revoked,
  created_at,
  last_used_at,
  expires_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'admin@xbrl-api.com' LIMIT 1),
  'Claude Desktop API Key',
  'xbrl_live_oLk1j9',
  'Y6T0ZoihCgvSWe1O8ceqTYeyzr565coiwvy1wXAYrFg=',
  ARRAY['read:markdown'],
  false,
  now(),
  null,
  now() + interval '1 year'
);

-- 3. 確認
SELECT 
  ak.id,
  ak.name,
  ak.key_prefix,
  ak.scopes,
  ak.created_at,
  au.email
FROM api_keys ak
LEFT JOIN auth.users au ON ak.user_id = au.id
WHERE ak.key_prefix = 'xbrl_live_oLk1j9';