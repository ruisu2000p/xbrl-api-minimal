-- APIキーの発行者メールアドレスを確認・設定するSQL

-- 1. 現在のAPIキーと発行者情報を確認
SELECT 
  ak.id as key_id,
  ak.name as key_name,
  ak.key_prefix || '...' || ak.key_suffix as api_key_display,
  ak.user_id,
  ak.created_at as key_created,
  ak.is_active,
  ak.status,
  -- auth.usersから
  au.id as auth_user_id,
  au.email as auth_email,
  au.created_at as auth_created,
  -- public.usersから
  pu.id as public_user_id,
  pu.email as public_email
FROM api_keys ak
LEFT JOIN auth.users au ON ak.user_id = au.id
LEFT JOIN public.users pu ON ak.user_id = pu.id
WHERE ak.key_prefix LIKE 'xbrl_live_%'
ORDER BY ak.created_at DESC;

-- 2. 統計：メールアドレス別のAPIキー数
SELECT 
  COALESCE(au.email, pu.email, 'No Email Set') as user_email,
  COUNT(ak.id) as api_key_count,
  SUM(ak.total_requests) as total_requests,
  MAX(ak.last_used_at) as last_activity
FROM api_keys ak
LEFT JOIN auth.users au ON ak.user_id = au.id
LEFT JOIN public.users pu ON ak.user_id = pu.id
GROUP BY COALESCE(au.email, pu.email, 'No Email Set')
ORDER BY api_key_count DESC;

-- 3. メールアドレスが設定されていないAPIキーを見つける
SELECT 
  ak.id,
  ak.key_prefix || '...' as key,
  ak.name,
  ak.user_id,
  'No email found' as issue
FROM api_keys ak
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = ak.user_id AND au.email IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = ak.user_id AND pu.email IS NOT NULL
);

-- 4. 修正案：デフォルトユーザーにメールを設定
-- public.usersテーブルが存在する場合
INSERT INTO public.users (id, email, created_at)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'system@xbrl-api.com', now())
ON CONFLICT (id) DO UPDATE 
SET email = COALESCE(public.users.email, EXCLUDED.email);

-- 5. Supabase Authにユーザーを作成（管理者権限が必要）
-- このSQLは手動で実行が必要な場合があります
/*
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'system@xbrl-api.com',
  crypt('system-password-2025', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "System User"}'
) ON CONFLICT (id) DO NOTHING;
*/