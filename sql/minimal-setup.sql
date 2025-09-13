-- ===========================================
-- 最小限セットアップ（段階的実行用）
-- ===========================================

-- STEP 1: まずこれを実行
-- ===========================================

-- 企業テーブル作成
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  ticker TEXT,
  name TEXT NOT NULL,
  sector TEXT,
  market TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: STEP1が成功したらこれを実行
-- ===========================================

-- 基本的な企業データを投入（5社のみ）
INSERT INTO companies (id, ticker, name, sector, description) VALUES
('7203', '7203', 'トヨタ自動車株式会社', '輸送用機器', '世界最大級の自動車メーカー'),
('6758', '6758', 'ソニーグループ株式会社', '電気機器', 'エレクトロニクス・エンタテインメント'),
('9984', '9984', 'ソフトバンクグループ株式会社', '情報・通信業', 'インターネット関連企業への投資'),
('7974', '7974', '任天堂株式会社', 'その他製品', 'ゲーム機器・ソフトウェアの開発製造'),
('2220', '2220', '亀田製菓株式会社', '食料品', '米菓の製造販売');

-- STEP 3: STEP2が成功したらこれを実行
-- ===========================================

-- RLS設定
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ポリシー作成
DROP POLICY IF EXISTS "Allow public read access on companies" ON companies;
CREATE POLICY "Allow public read access on companies" ON companies
  FOR SELECT USING (true);

-- STEP 4: 確認
-- ===========================================

-- データ確認
SELECT COUNT(*) as company_count FROM companies;
SELECT * FROM companies ORDER BY id;

-- APIキー確認
SELECT 
  key_prefix,
  masked_key,
  name,
  status,
  plan,
  is_active
FROM api_keys 
WHERE key_prefix LIKE 'xbrl_live%'
ORDER BY created_at DESC;