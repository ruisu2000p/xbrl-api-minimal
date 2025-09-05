-- ===========================================
-- APIキーのハッシュ値を修正
-- ===========================================

-- 現在のAPIキーの状態を確認
SELECT 
  id,
  key_prefix,
  key_hash,
  name,
  status,
  is_active
FROM api_keys 
WHERE key_prefix = 'xbrl_live_mMOXQ3'
ORDER BY created_at DESC
LIMIT 1;

-- 正しいハッシュ値で更新
UPDATE api_keys 
SET 
  key_hash = encode(digest('xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu', 'sha256'), 'hex'),
  name = 'MCP Server API Key',
  status = 'active',
  is_active = true,
  plan = 'pro',
  tier = 'pro',
  daily_quota = 100000,
  rate_limit_per_day = 100000,
  updated_at = NOW()
WHERE key_prefix = 'xbrl_live_mMOXQ3'
  AND is_active = true;

-- 更新後の確認
SELECT 
  id,
  key_prefix,
  key_hash,
  name,
  status,
  plan,
  is_active
FROM api_keys 
WHERE key_prefix = 'xbrl_live_mMOXQ3'
ORDER BY created_at DESC
LIMIT 1;

-- ハッシュ値の検証（正しければ一致する）
SELECT 
  'Original Key' as type,
  'xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu' as value,
  encode(digest('xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu', 'sha256'), 'hex') as hash
UNION ALL
SELECT 
  'Database Hash' as type,
  'stored in db' as value,
  key_hash as hash
FROM api_keys 
WHERE key_prefix = 'xbrl_live_mMOXQ3' 
  AND is_active = true
LIMIT 1;