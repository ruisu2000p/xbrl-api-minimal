-- ===========================================
-- 段階的Supabaseセットアップ
-- エラーを避けるために順次実行
-- ===========================================

-- ============ STEP 1: 基本テーブル作成 ============
-- まずはこのセクションを実行

-- 1. 企業マスタテーブル
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  ticker TEXT,
  name TEXT NOT NULL,
  sector TEXT,
  market TEXT,
  edinet_code TEXT,
  security_code TEXT,
  jcn TEXT,
  established_date DATE,
  listing_date DATE,
  fiscal_year_end TEXT,
  capital BIGINT,
  employees INTEGER,
  average_age NUMERIC(4,1),
  average_salary BIGINT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. APIキー管理テーブル
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  user_id UUID,
  user_email TEXT NOT NULL,
  plan TEXT DEFAULT 'beta' CHECK (plan IN ('free', 'beta', 'pro')),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  monthly_limit INTEGER DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ STEP 2: インデックス作成 ============
-- STEP 1が成功したらこのセクションを実行

CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- ============ STEP 3: 企業データ投入 ============
-- STEP 2が成功したらこのセクションを実行

INSERT INTO companies (id, ticker, name, sector, market, security_code, fiscal_year_end, description) VALUES
('7203', '7203', 'トヨタ自動車株式会社', '輸送用機器', '東証プライム', '7203', '2022-03-31', '世界最大級の自動車メーカー'),
('7267', '7267', '本田技研工業株式会社', '輸送用機器', '東証プライム', '7267', '2022-03-31', '二輪車・四輪車の製造販売'),
('6758', '6758', 'ソニーグループ株式会社', '電気機器', '東証プライム', '6758', '2022-03-31', 'エレクトロニクス・エンタテインメント'),
('9984', '9984', 'ソフトバンクグループ株式会社', '情報・通信業', '東証プライム', '9984', '2022-03-31', 'インターネット関連企業への投資'),
('7974', '7974', '任天堂株式会社', 'その他製品', '東証プライム', '7974', '2022-03-31', 'ゲーム機器・ソフトウェアの開発製造'),
('2220', '2220', '亀田製菓株式会社', '食料品', '東証プライム', '2220', '2022-03-31', '米菓の製造販売'),
('8306', '8306', '株式会社三菱UFJフィナンシャル・グループ', '銀行業', '東証プライム', '8306', '2022-03-31', '日本最大の金融グループ'),
('4502', '4502', '武田薬品工業株式会社', '医薬品', '東証プライム', '4502', '2022-03-31', '日本最大の製薬会社'),
('2802', '2802', '味の素株式会社', '食料品', '東証プライム', '2802', '2022-03-31', '調味料・加工食品メーカー'),
('8058', '8058', '三菱商事株式会社', '卸売業', '東証プライム', '8058', '2022-03-31', '日本最大の総合商社')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sector = EXCLUDED.sector,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============ STEP 4: APIキー登録 ============
-- STEP 3が成功したらこのセクションを実行

INSERT INTO api_keys (
  key_hash,
  key_prefix,
  user_email,
  plan,
  is_active,
  monthly_limit,
  expires_at
) VALUES (
  encode(digest('xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu', 'sha256'), 'hex'),
  'xbrl_live_mM...k8qxu',
  'demo@example.com',
  'pro',
  true,
  100000,
  NOW() + INTERVAL '1 year'
) ON CONFLICT (key_hash) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  plan = EXCLUDED.plan,
  monthly_limit = EXCLUDED.monthly_limit;

-- ============ STEP 5: RLS設定（オプション） ============
-- APIが動作してからこのセクションを実行（任意）

-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public read access on companies" ON companies;
-- CREATE POLICY "Allow public read access on companies" ON companies
--   FOR SELECT USING (true);

-- ============ STEP 6: 確認クエリ ============
-- 設定確認用

SELECT '企業データ' as item, COUNT(*) as count FROM companies
UNION ALL
SELECT 'APIキー' as item, COUNT(*) as count FROM api_keys;

SELECT 'セットアップ完了' as status, NOW() as timestamp;