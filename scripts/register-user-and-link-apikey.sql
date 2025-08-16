-- pumpkin8000@gmail.com ユーザーの登録とAPIキーの紐付け

-- 1. まず既存のユーザーを確認
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'pumpkin8000@gmail.com';

-- 2. ユーザーが存在しない場合は作成（Supabase Authに登録）
-- 注意: この方法は管理者権限が必要です
-- 通常は /register ページから登録することを推奨
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
  'pumpkin8000@gmail.com',
  crypt('your-secure-password-here', gen_salt('bf')), -- パスワードを設定してください
  now(), -- メール確認済みとして登録
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Pumpkin User"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- 3. 既存のAPIキーをpumpkin8000@gmail.comユーザーに紐付け
UPDATE api_keys 
SET 
  user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'pumpkin8000@gmail.com' 
    LIMIT 1
  ),
  updated_at = now()
WHERE key_prefix IN ('xbrl_live_RI6So0', 'xbrl_live_oLk1j9');

-- 4. 確認：APIキーと新しい所有者を表示
SELECT 
  ak.id,
  ak.name,
  ak.key_prefix || '...' || ak.key_suffix as api_key,
  ak.is_active,
  ak.status,
  au.email as owner_email,
  ak.created_at,
  ak.updated_at
FROM api_keys ak
LEFT JOIN auth.users au ON ak.user_id = au.id
WHERE au.email = 'pumpkin8000@gmail.com'
   OR ak.key_prefix IN ('xbrl_live_RI6So0', 'xbrl_live_oLk1j9')
ORDER BY ak.created_at DESC;

-- 5. 統計：pumpkin8000@gmail.comのAPIキー情報
SELECT 
  au.email,
  COUNT(ak.id) as total_api_keys,
  COUNT(CASE WHEN ak.is_active = true THEN 1 END) as active_keys,
  SUM(ak.total_requests) as total_requests,
  MAX(ak.last_used_at) as last_api_usage
FROM auth.users au
LEFT JOIN api_keys ak ON au.id = ak.user_id
WHERE au.email = 'pumpkin8000@gmail.com'
GROUP BY au.email;