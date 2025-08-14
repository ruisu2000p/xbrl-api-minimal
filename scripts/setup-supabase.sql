-- Supabaseデータベーススキーマ
-- このSQLをSupabaseのSQL Editorで実行してください

-- 企業マスタテーブル
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(20) PRIMARY KEY,
  edinet_code VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  sector VARCHAR(100),
  listing VARCHAR(50),
  fiscal_year_end DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ドキュメントテーブル
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) REFERENCES companies(id),
  year INTEGER NOT NULL,
  doc_type VARCHAR(50) NOT NULL, -- 'securities_report', 'quarterly_report', etc
  file_path VARCHAR(500),
  storage_key VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_company_year (company_id, year)
);

-- 財務データテーブル
CREATE TABLE IF NOT EXISTS financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(20) REFERENCES companies(id),
  year INTEGER NOT NULL,
  quarter INTEGER,
  revenue BIGINT,
  operating_income BIGINT,
  net_income BIGINT,
  total_assets BIGINT,
  total_equity BIGINT,
  roe DECIMAL(5, 2),
  roa DECIMAL(5, 2),
  data JSONB, -- その他の財務指標
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_company_year_quarter (company_id, year, quarter)
);

-- APIキーテーブル
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  key_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(20) NOT NULL, -- 'free', 'standard', 'pro'
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 使用履歴テーブル
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_api_key_created (api_key_id, created_at)
);

-- Row Level Security (RLS) 設定
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- 公開データへのアクセスポリシー
CREATE POLICY "Companies are viewable by everyone" 
  ON companies FOR SELECT 
  USING (true);

CREATE POLICY "Documents are viewable by everyone" 
  ON documents FOR SELECT 
  USING (true);

CREATE POLICY "Financial data is viewable by everyone" 
  ON financial_data FOR SELECT 
  USING (true);

-- APIキーは所有者のみアクセス可能
CREATE POLICY "Users can view own API keys" 
  ON api_keys FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys" 
  ON api_keys FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 関数：企業検索
CREATE OR REPLACE FUNCTION search_companies(
  search_term TEXT,
  sector_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id VARCHAR(20),
  name VARCHAR(255),
  sector VARCHAR(100),
  listing VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.sector, c.listing
  FROM companies c
  WHERE 
    (search_term IS NULL OR c.name ILIKE '%' || search_term || '%')
    AND (sector_filter IS NULL OR c.sector = sector_filter)
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- インデックス作成
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_sector ON companies(sector);
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_financial_data_year ON financial_data(year);