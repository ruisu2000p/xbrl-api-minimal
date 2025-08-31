-- ===========================================
-- 安全なSupabaseセットアップ
-- ON CONFLICTを使わない安全な方法
-- ===========================================

-- Step 1: 企業テーブル作成
-- ===========================================

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

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

-- Step 2: 既存データをクリアして再投入（安全）
-- ===========================================

-- 既存のcompaniesデータを削除（必要に応じて）
DELETE FROM companies WHERE id IN ('7203', '7267', '7201', '6758', '6501', '6902', '9984', '9432', '9433', '9983', '8267', '7974', '8306', '8411', '8316', '4502', '4503', '4519', '2802', '2269', '2220', '8058', '8001', '8031', '9020', '9022', '9021', '4689', '4755');

-- 主要企業データを投入
INSERT INTO companies (id, ticker, name, sector, market, security_code, fiscal_year_end, description) VALUES
('7203', '7203', 'トヨタ自動車株式会社', '輸送用機器', '東証プライム', '7203', '2022-03-31', '世界最大級の自動車メーカー'),
('7267', '7267', '本田技研工業株式会社', '輸送用機器', '東証プライム', '7267', '2022-03-31', '二輪車・四輪車の製造販売'),
('7201', '7201', '日産自動車株式会社', '輸送用機器', '東証プライム', '7201', '2022-03-31', '自動車の製造・販売'),
('6758', '6758', 'ソニーグループ株式会社', '電気機器', '東証プライム', '6758', '2022-03-31', 'エレクトロニクス・エンタテインメント'),
('6501', '6501', '株式会社日立製作所', '電気機器', '東証プライム', '6501', '2022-03-31', '総合電機メーカー'),
('6902', '6902', '株式会社デンソー', '輸送用機器', '東証プライム', '6902', '2022-03-31', '自動車部品の製造'),
('9984', '9984', 'ソフトバンクグループ株式会社', '情報・通信業', '東証プライム', '9984', '2022-03-31', 'インターネット関連企業への投資'),
('9432', '9432', '日本電信電話株式会社', '情報・通信業', '東証プライム', '9432', '2022-03-31', '通信事業の持株会社'),
('9433', '9433', 'KDDI株式会社', '情報・通信業', '東証プライム', '9433', '2022-03-31', '電気通信事業'),
('9983', '9983', '株式会社ファーストリテイリング', '小売業', '東証プライム', '9983', '2022-08-31', 'ユニクロなどを展開'),
('8267', '8267', 'イオン株式会社', '小売業', '東証プライム', '8267', '2022-02-28', '総合小売業'),
('7974', '7974', '任天堂株式会社', 'その他製品', '東証プライム', '7974', '2022-03-31', 'ゲーム機器・ソフトウェアの開発製造'),
('8306', '8306', '株式会社三菱UFJフィナンシャル・グループ', '銀行業', '東証プライム', '8306', '2022-03-31', '日本最大の金融グループ'),
('8411', '8411', '株式会社みずほフィナンシャルグループ', '銀行業', '東証プライム', '8411', '2022-03-31', '総合金融グループ'),
('8316', '8316', '株式会社三井住友フィナンシャルグループ', '銀行業', '東証プライム', '8316', '2022-03-31', '総合金融グループ'),
('4502', '4502', '武田薬品工業株式会社', '医薬品', '東証プライム', '4502', '2022-03-31', '日本最大の製薬会社'),
('4503', '4503', 'アステラス製薬株式会社', '医薬品', '東証プライム', '4503', '2022-03-31', '新薬の研究開発・製造・販売'),
('4519', '4519', '中外製薬株式会社', '医薬品', '東証プライム', '4519', '2022-12-31', 'ロシュグループの医薬品会社'),
('2802', '2802', '味の素株式会社', '食料品', '東証プライム', '2802', '2022-03-31', '調味料・加工食品メーカー'),
('2269', '2269', '明治ホールディングス株式会社', '食料品', '東証プライム', '2269', '2022-03-31', '乳製品・菓子・医薬品'),
('2220', '2220', '亀田製菓株式会社', '食料品', '東証プライム', '2220', '2022-03-31', '米菓の製造販売'),
('8058', '8058', '三菱商事株式会社', '卸売業', '東証プライム', '8058', '2022-03-31', '日本最大の総合商社'),
('8001', '8001', '伊藤忠商事株式会社', '卸売業', '東証プライム', '8001', '2022-03-31', '大手総合商社'),
('8031', '8031', '三井物産株式会社', '卸売業', '東証プライム', '8031', '2022-03-31', '大手総合商社'),
('9020', '9020', '東日本旅客鉄道株式会社', '陸運業', '東証プライム', '9020', '2022-03-31', 'JR東日本'),
('9022', '9022', '東海旅客鉄道株式会社', '陸運業', '東証プライム', '9022', '2022-03-31', 'JR東海'),
('9021', '9021', '西日本旅客鉄道株式会社', '陸運業', '東証プライム', '9021', '2022-03-31', 'JR西日本'),
('4689', '4689', 'Zホールディングス株式会社', '情報・通信業', '東証プライム', '4689', '2022-03-31', 'ヤフー・LINE等を傘下に持つ'),
('4755', '4755', '楽天グループ株式会社', 'サービス業', '東証プライム', '4755', '2021-12-31', 'インターネットサービス');

-- Step 3: APIキーの確認と更新
-- ===========================================

-- 既存のAPIキーを確認
SELECT 
  key_prefix,
  masked_key,
  name,
  status,
  plan
FROM api_keys 
WHERE key_prefix LIKE 'xbrl_live%' 
  AND is_active = true
ORDER BY created_at DESC;

-- 必要に応じて既存のAPIキーのプランを更新
UPDATE api_keys 
SET 
  plan = 'pro',
  tier = 'pro',
  daily_quota = 100000,
  rate_limit_per_day = 100000,
  status = 'active',
  updated_at = NOW()
WHERE key_prefix = 'xbrl_live_mMOXQ3'
  AND is_active = true;

-- Step 4: RLS設定
-- ===========================================

-- 企業テーブルを全員に読み取り可能にする
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除して新しく作成
DROP POLICY IF EXISTS "Allow public read access on companies" ON companies;
CREATE POLICY "Allow public read access on companies" ON companies
  FOR SELECT USING (true);

-- Step 5: 確認クエリ
-- ===========================================

-- 投入したデータの確認
SELECT 
  '企業データ' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT sector) as unique_sectors
FROM companies
UNION ALL
SELECT 
  'APIキー（アクティブ）' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT plan) as unique_plans
FROM api_keys
WHERE is_active = true;

-- セクター別企業数
SELECT 
  sector,
  COUNT(*) as company_count
FROM companies
WHERE sector IS NOT NULL
GROUP BY sector
ORDER BY company_count DESC;

-- 主要企業の確認
SELECT 
  id,
  ticker,
  name,
  sector
FROM companies
WHERE id IN ('7203', '6758', '9984', '7974', '2220')
ORDER BY id;

-- アクティブなAPIキーの確認
SELECT 
  name,
  key_prefix,
  masked_key,
  status,
  plan,
  tier,
  daily_quota,
  expires_at
FROM api_keys
WHERE is_active = true AND status = 'active'
ORDER BY created_at DESC;

-- セットアップ完了
SELECT 
  '✅ セットアップ完了' as status,
  NOW() as timestamp,
  'データとAPIキーが正常に設定されました' as message;