-- ===========================================
-- 本番環境用APIキー修正
-- crypto.createHash('sha256')と同じハッシュを生成
-- ===========================================

-- 現在のAPIキーを確認
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

-- Node.jsのcrypto.createHash('sha256')と同じハッシュを生成
-- 'xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu' のハッシュ値
UPDATE api_keys 
SET 
  key_hash = encode(digest('xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu', 'sha256'), 'hex'),
  name = 'Production MCP Server Key',
  status = 'active',
  is_active = true,
  plan = 'pro',
  tier = 'pro',
  daily_quota = 100000,
  rate_limit_per_day = 100000,
  rate_limit_per_hour = 10000,
  rate_limit_per_minute = 100,
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
  tier,
  is_active,
  daily_quota
FROM api_keys 
WHERE key_prefix = 'xbrl_live_mMOXQ3'
ORDER BY created_at DESC
LIMIT 1;

-- ハッシュ値の検証
SELECT 
  'Expected Hash' as label,
  encode(digest('xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu', 'sha256'), 'hex') as value
UNION ALL
SELECT 
  'Database Hash' as label,
  key_hash as value
FROM api_keys 
WHERE key_prefix = 'xbrl_live_mMOXQ3' 
  AND is_active = true
LIMIT 1;

-- 企業データも確認・投入
INSERT INTO companies (id, ticker, name, sector, description) 
SELECT '7203', '7203', 'トヨタ自動車株式会社', '輸送用機器', 'テスト'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE id = '7203');

INSERT INTO companies (id, ticker, name, sector, description) 
SELECT '6758', '6758', 'ソニーグループ株式会社', '電気機器', 'テスト'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE id = '6758');

INSERT INTO companies (id, ticker, name, sector, description) 
SELECT '2220', '2220', '亀田製菓株式会社', '食料品', 'テスト'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE id = '2220');

-- 確認クエリ
SELECT COUNT(*) as company_count FROM companies;
SELECT id, name, sector FROM companies ORDER BY id LIMIT 5;