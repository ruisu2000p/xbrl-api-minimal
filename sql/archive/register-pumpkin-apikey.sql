-- pumpkin8000@gmail.com の新しいAPIキーを登録
-- APIキー: xbrl_live_BJRCDnU5BhKTvA2vzj2UOrYU45fGDK61

-- 1. APIキー情報の準備
-- SHA256ハッシュの計算が必要（以下は仮の値、実際のハッシュ値に置き換えてください）
-- Node.jsで計算: crypto.createHash('sha256').update('xbrl_live_BJRCDnU5BhKTvA2vzj2UOrYU45fGDK61').digest('base64')

-- 2. まずpumpkin8000@gmail.comユーザーを確認/作成
DO $$
DECLARE
  v_user_id uuid;
  v_api_key_hash text;
BEGIN
  -- ユーザーIDを取得または作成
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'pumpkin8000@gmail.com';
  
  IF v_user_id IS NULL THEN
    -- ユーザーが存在しない場合は作成
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
      gen_random_uuid(),
      'pumpkin8000@gmail.com',
      crypt('temp-password-2025', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Pumpkin User", "registered_via": "admin"}'
    )
    RETURNING id INTO v_user_id;
  END IF;
  
  -- APIキーのハッシュ値（実際の値に置き換えてください）
  v_api_key_hash := encode(sha256('xbrl_live_BJRCDnU5BhKTvA2vzj2UOrYU45fGDK61'::bytea), 'base64');
  
  -- APIキーを登録
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
    metadata,
    created_at,
    expires_at,
    tier,
    total_requests,
    successful_requests,
    failed_requests
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Production API Key (pumpkin8000)',
    'xbrl_live_BJRCD',  -- 先頭16文字
    'DK61',             -- 末尾4文字
    v_api_key_hash,
    true,
    'active',
    'production',
    '{"endpoints": ["*"], "scopes": ["read:markdown"], "rate_limit": 10000}'::jsonb,
    '{"created_via": "dashboard", "user_email": "pumpkin8000@gmail.com"}'::jsonb,
    now(),
    now() + interval '1 year',
    'pro',
    0,
    0,
    0
  ) ON CONFLICT (key_hash) DO UPDATE
  SET 
    user_id = v_user_id,
    updated_at = now();
  
  RAISE NOTICE 'API key registered for user: %', v_user_id;
END $$;

-- 3. 確認：pumpkin8000@gmail.comの全APIキー
SELECT 
  ak.id,
  ak.name,
  ak.key_prefix || '...' || ak.key_suffix as display_key,
  ak.is_active,
  ak.status,
  ak.created_at,
  ak.expires_at,
  au.email as owner_email
FROM api_keys ak
JOIN auth.users au ON ak.user_id = au.id
WHERE au.email = 'pumpkin8000@gmail.com'
ORDER BY ak.created_at DESC;

-- 4. 既存のAPIキーも同じユーザーに紐付け（必要な場合）
UPDATE api_keys 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'pumpkin8000@gmail.com' 
  LIMIT 1
)
WHERE key_prefix IN (
  'xbrl_live_RI6So0',  -- 以前のキー
  'xbrl_live_oLk1j9'   -- 最初のキー
) AND user_id = 'a0000000-0000-0000-0000-000000000001';

-- 5. 最終確認：全APIキーの状態
SELECT 
  'Total Keys' as metric,
  COUNT(*) as value
FROM api_keys
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'pumpkin8000@gmail.com')
UNION ALL
SELECT 
  'Active Keys',
  COUNT(*)
FROM api_keys
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'pumpkin8000@gmail.com')
  AND is_active = true;