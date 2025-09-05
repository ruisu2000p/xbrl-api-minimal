-- ===========================================
-- 完全なSupabaseセットアップ
-- XBRL財務データAPI用データベース構築
-- ===========================================

-- Step 1: 全テーブルを作成
-- ===========================================

-- 1-1. 企業マスタテーブル
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

-- 1-2. APIキー管理テーブル
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL, -- 表示用プレフィックス
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

-- 1-3. API使用履歴テーブル
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1-4. 財務レポートテーブル（オプション）
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  fiscal_period TEXT,
  doc_type TEXT CHECK (doc_type IN ('public', 'audit')),
  markdown_content TEXT,
  storage_path TEXT,
  financial_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, fiscal_year, doc_type)
);

-- Step 2: インデックスを作成
-- ===========================================

-- 企業テーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_security_code ON companies(security_code);
CREATE INDEX IF NOT EXISTS idx_companies_edinet_code ON companies(edinet_code);

-- APIキー用インデックス
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_email ON api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);

-- API使用履歴用インデックス
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);

-- Step 3: RLSポリシーを設定
-- ===========================================

-- 企業テーブル: 全員読み取り可能
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーがある場合は削除
DROP POLICY IF EXISTS "Allow public read access on companies" ON companies;
CREATE POLICY "Allow public read access on companies" ON companies
  FOR SELECT USING (true);

-- APIキーテーブル: 所有者のみアクセス可能
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーがある場合は削除
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- API使用履歴: 所有者のみアクセス可能
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーがある場合は削除  
DROP POLICY IF EXISTS "Users can view own usage logs" ON api_usage_logs;
CREATE POLICY "Users can view own usage logs" ON api_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_keys 
      WHERE api_keys.id = api_usage_logs.api_key_id 
      AND api_keys.user_email = auth.jwt() ->> 'email'
    )
  );

-- Step 4: 主要企業データを投入
-- ===========================================

INSERT INTO companies (id, ticker, name, sector, market, security_code, fiscal_year_end, description) VALUES
-- 自動車
('7203', '7203', 'トヨタ自動車株式会社', '輸送用機器', '東証プライム', '7203', '2022-03-31', '世界最大級の自動車メーカー'),
('7267', '7267', '本田技研工業株式会社', '輸送用機器', '東証プライム', '7267', '2022-03-31', '二輪車・四輪車の製造販売'),
('7201', '7201', '日産自動車株式会社', '輸送用機器', '東証プライム', '7201', '2022-03-31', '自動車の製造・販売'),

-- 電気機器
('6758', '6758', 'ソニーグループ株式会社', '電気機器', '東証プライム', '6758', '2022-03-31', 'エレクトロニクス・エンタテインメント'),
('6501', '6501', '株式会社日立製作所', '電気機器', '東証プライム', '6501', '2022-03-31', '総合電機メーカー'),
('6902', '6902', '株式会社デンソー', '輸送用機器', '東証プライム', '6902', '2022-03-31', '自動車部品の製造'),

-- 情報・通信
('9984', '9984', 'ソフトバンクグループ株式会社', '情報・通信業', '東証プライム', '9984', '2022-03-31', 'インターネット関連企業への投資'),
('9432', '9432', '日本電信電話株式会社', '情報・通信業', '東証プライム', '9432', '2022-03-31', '通信事業の持株会社'),
('9433', '9433', 'KDDI株式会社', '情報・通信業', '東証プライム', '9433', '2022-03-31', '電気通信事業'),

-- 小売業
('9983', '9983', '株式会社ファーストリテイリング', '小売業', '東証プライム', '9983', '2022-08-31', 'ユニクロなどを展開'),
('8267', '8267', 'イオン株式会社', '小売業', '東証プライム', '8267', '2022-02-28', '総合小売業'),
('7974', '7974', '任天堂株式会社', 'その他製品', '東証プライム', '7974', '2022-03-31', 'ゲーム機器・ソフトウェアの開発製造'),

-- 金融
('8306', '8306', '株式会社三菱UFJフィナンシャル・グループ', '銀行業', '東証プライム', '8306', '2022-03-31', '日本最大の金融グループ'),
('8411', '8411', '株式会社みずほフィナンシャルグループ', '銀行業', '東証プライム', '8411', '2022-03-31', '総合金融グループ'),
('8316', '8316', '株式会社三井住友フィナンシャルグループ', '銀行業', '東証プライム', '8316', '2022-03-31', '総合金融グループ'),

-- 医薬品
('4502', '4502', '武田薬品工業株式会社', '医薬品', '東証プライム', '4502', '2022-03-31', '日本最大の製薬会社'),
('4503', '4503', 'アステラス製薬株式会社', '医薬品', '東証プライム', '4503', '2022-03-31', '新薬の研究開発・製造・販売'),
('4519', '4519', '中外製薬株式会社', '医薬品', '東証プライム', '4519', '2022-12-31', 'ロシュグループの医薬品会社'),

-- 食品
('2802', '2802', '味の素株式会社', '食料品', '東証プライム', '2802', '2022-03-31', '調味料・加工食品メーカー'),
('2269', '2269', '明治ホールディングス株式会社', '食料品', '東証プライム', '2269', '2022-03-31', '乳製品・菓子・医薬品'),
('2220', '2220', '亀田製菓株式会社', '食料品', '東証プライム', '2220', '2022-03-31', '米菓の製造販売'),

-- 商社
('8058', '8058', '三菱商事株式会社', '卸売業', '東証プライム', '8058', '2022-03-31', '日本最大の総合商社'),
('8001', '8001', '伊藤忠商事株式会社', '卸売業', '東証プライム', '8001', '2022-03-31', '大手総合商社'),
('8031', '8031', '三井物産株式会社', '卸売業', '東証プライム', '8031', '2022-03-31', '大手総合商社'),

-- その他主要企業
('9020', '9020', '東日本旅客鉄道株式会社', '陸運業', '東証プライム', '9020', '2022-03-31', 'JR東日本'),
('9022', '9022', '東海旅客鉄道株式会社', '陸運業', '東証プライム', '9022', '2022-03-31', 'JR東海'),
('9021', '9021', '西日本旅客鉄道株式会社', '陸運業', '東証プライム', '9021', '2022-03-31', 'JR西日本'),

-- テクノロジー企業
('4689', '4689', 'Zホールディングス株式会社', '情報・通信業', '東証プライム', '4689', '2022-03-31', 'ヤフー・LINE等を傘下に持つ'),
('4755', '4755', '楽天グループ株式会社', 'サービス業', '東証プライム', '4755', '2021-12-31', 'インターネットサービス')

ON CONFLICT (id) DO UPDATE SET
  ticker = EXCLUDED.ticker,
  name = EXCLUDED.name,
  sector = EXCLUDED.sector,
  market = EXCLUDED.market,
  security_code = EXCLUDED.security_code,
  fiscal_year_end = EXCLUDED.fiscal_year_end,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Step 5: テストAPIキーを作成
-- ===========================================

-- SHA256関数を使用してAPIキーをハッシュ化
-- APIキー: xbrl_live_mMOXQ3bLDbuzHLaFjXN7bvYnRnf1k8qxu

INSERT INTO api_keys (
  key_hash,
  key_prefix,
  user_email,
  plan,
  is_active,
  monthly_limit,
  expires_at
) VALUES (
  -- SHA256ハッシュ（実際の値は環境変数から取得）
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
  monthly_limit = EXCLUDED.monthly_limit,
  expires_at = EXCLUDED.expires_at;

-- Step 6: 統計情報とテスト
-- ===========================================

-- データ投入確認
SELECT 
  '企業データ' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT sector) as unique_sectors
FROM companies
UNION ALL
SELECT 
  'APIキー' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT plan) as unique_plans
FROM api_keys;

-- セクター別企業数
SELECT 
  sector,
  COUNT(*) as company_count
FROM companies
WHERE sector IS NOT NULL
GROUP BY sector
ORDER BY company_count DESC
LIMIT 10;

-- 主要企業の確認
SELECT 
  id,
  ticker,
  name,
  sector
FROM companies
WHERE ticker IN ('7203', '6758', '9984', '8306', '4502')
ORDER BY ticker;

-- APIキーの確認
SELECT 
  key_prefix,
  user_email,
  plan,
  is_active,
  monthly_limit,
  usage_count
FROM api_keys
WHERE is_active = true;

-- ===========================================
-- セットアップ完了
-- ===========================================

SELECT 
  '✅ Supabaseセットアップ完了' as status,
  NOW() as completed_at;