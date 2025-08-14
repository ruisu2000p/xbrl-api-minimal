-- ===========================================
-- Supabase データベーススキーマ設定
-- ===========================================

-- 企業マスタテーブル
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  ticker TEXT UNIQUE,
  name TEXT NOT NULL,
  sector TEXT,
  market TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 財務レポートテーブル
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  fiscal_period TEXT, -- 例: "2022年3月期"
  doc_type TEXT CHECK (doc_type IN ('public', 'audit')),
  markdown_content TEXT, -- 最初の10000文字を保存
  storage_path TEXT, -- Storageのファイルパス
  financial_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, fiscal_year, doc_type)
);

-- APIキー管理テーブル
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  user_id UUID,
  user_email TEXT NOT NULL,
  plan TEXT DEFAULT 'beta',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  monthly_limit INTEGER DEFAULT 1000,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API使用履歴テーブル
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

CREATE INDEX IF NOT EXISTS idx_financial_reports_company_year 
  ON financial_reports(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_financial_reports_doc_type 
  ON financial_reports(doc_type);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_email ON api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key 
  ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at 
  ON api_usage_logs(created_at);

-- フルテキスト検索用インデックス（PostgreSQL）
CREATE INDEX IF NOT EXISTS idx_financial_reports_content_search 
  ON financial_reports USING gin(to_tsvector('japanese', markdown_content));

-- トリガー: updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_financial_reports_updated_at 
  BEFORE UPDATE ON financial_reports 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- ビュー: 企業と最新レポートの結合
CREATE OR REPLACE VIEW company_latest_reports AS
SELECT 
  c.*,
  fr.fiscal_year,
  fr.fiscal_period,
  fr.financial_data,
  fr.storage_path
FROM companies c
LEFT JOIN LATERAL (
  SELECT * FROM financial_reports
  WHERE company_id = c.id
  ORDER BY fiscal_year DESC
  LIMIT 1
) fr ON true;

-- ビュー: API使用統計
CREATE OR REPLACE VIEW api_usage_stats AS
SELECT 
  ak.user_email,
  ak.plan,
  COUNT(aul.id) as total_calls,
  COUNT(CASE WHEN aul.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as calls_24h,
  COUNT(CASE WHEN aul.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as calls_30d,
  AVG(aul.response_time_ms) as avg_response_time,
  MAX(aul.created_at) as last_api_call
FROM api_keys ak
LEFT JOIN api_usage_logs aul ON ak.id = aul.api_key_id
GROUP BY ak.user_email, ak.plan;

-- Row Level Security (RLS) ポリシー設定
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- 公開データへの読み取りアクセス許可
CREATE POLICY "Companies are viewable by everyone" 
  ON companies FOR SELECT 
  USING (true);

CREATE POLICY "Financial reports are viewable by everyone" 
  ON financial_reports FOR SELECT 
  USING (true);

-- APIキーは所有者のみアクセス可能
CREATE POLICY "Users can only see their own API keys" 
  ON api_keys FOR ALL 
  USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can only see their own usage logs" 
  ON api_usage_logs FOR SELECT 
  USING (
    api_key_id IN (
      SELECT id FROM api_keys 
      WHERE user_email = auth.jwt() ->> 'email'
    )
  );

-- サンプルデータ挿入（開発用）
INSERT INTO companies (id, ticker, name, sector, market) VALUES
  ('7203_toyota', '7203', 'トヨタ自動車株式会社', '輸送用機器', '東証プライム'),
  ('6758_sony', '6758', 'ソニーグループ株式会社', '電気機器', '東証プライム'),
  ('6861_keyence', '6861', '株式会社キーエンス', '電気機器', '東証プライム')
ON CONFLICT (id) DO NOTHING;

-- 権限設定
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;