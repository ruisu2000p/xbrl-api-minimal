-- 新しく発行されたAPIキーをSupabaseに登録
-- APIキー: xbrl_live_RI6So0THMeMwc5JH5dWw8ZY9zwPTaUKV

-- 1. まず既存のユーザーを確認
SELECT id, email FROM auth.users;

-- 2. usersテーブルがあるか確認（api_keysが参照している）
SELECT * FROM public.users LIMIT 5;

-- 3. 既存のテストユーザーIDを使用してAPIキーを登録
-- user_idは既存のものか、NULLを許可するか、デフォルト値を使用
INSERT INTO api_keys (
  id,
  user_id,
  name,
  key_prefix,
  key_suffix,
  key_hash,
  is_active,
  status,
  environment,
  permissions,
  created_at,
  expires_at,
  tier,
  total_requests,
  successful_requests,
  failed_requests
) VALUES (
  gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000001'::uuid, -- デフォルトテストユーザーID
  'Production API Key (xbrl_live_RI6So0)',
  'xbrl_live_RI6So0',
  'aUKV',
  'UV9CFG2S3H+ILnoJz3ilxVZFFpNK6hGhU3yLkPCmGD8=',
  true,
  'active',
  'production',
  '{"endpoints": ["*"], "scopes": ["read:markdown"], "rate_limit": 10000}'::jsonb,
  now(),
  now() + interval '1 year',
  'pro',
  0,
  0,
  0
) ON CONFLICT (key_hash) DO UPDATE
SET 
  is_active = true,
  status = 'active',
  updated_at = now();

-- 4. 確認
SELECT 
  id,
  name,
  key_prefix || '...' || key_suffix as display_key,
  is_active,
  status,
  created_at
FROM api_keys 
WHERE key_prefix = 'xbrl_live_RI6So0';

-- 5. もし外部キー制約を無視したい場合（一時的な解決策）
-- ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;

-- 6. またはusersテーブルにデフォルトユーザーを作成
INSERT INTO public.users (id, email, created_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 'default@system.local', now())
ON CONFLICT (id) DO NOTHING;