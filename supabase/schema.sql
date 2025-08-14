-- Supabaseデータベーススキーマ
-- このSQLをSupabaseのSQL Editorで実行してください

-- ユーザープロファイル
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  api_key TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API使用状況
CREATE TABLE api_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 企業マスタ
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_kana TEXT,
  ticker_symbol TEXT,
  industry TEXT,
  listed_market TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ドキュメントメタデータ
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  year INTEGER NOT NULL,
  section_id TEXT NOT NULL,
  section_name TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, year, section_id)
);

-- 財務データキャッシュ
CREATE TABLE financial_data (
  id BIGSERIAL PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  year INTEGER NOT NULL,
  revenue BIGINT,
  operating_income BIGINT,
  net_income BIGINT,
  total_assets BIGINT,
  equity BIGINT,
  roe DECIMAL(5,2),
  roa DECIMAL(5,2),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, year)
);

-- 料金プラン
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stripe_price_id TEXT,
  features JSONB,
  limits JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データ
INSERT INTO subscription_plans (id, name, price, features, limits) VALUES
  ('free', 'Free', 0, 
   '{"years": 1, "api_calls_per_month": 100, "csv_export": false}',
   '{"max_years": 1, "api_calls": 100}'),
  ('standard', 'Standard', 1080, 
   '{"years": 5, "api_calls_per_month": 3000, "csv_export": true}',
   '{"max_years": 5, "api_calls": 3000}'),
  ('pro', 'Pro', 2980, 
   '{"years": 20, "api_calls_per_month": -1, "csv_export": true}',
   '{"max_years": 20, "api_calls": -1}');

-- インデックス
CREATE INDEX idx_api_usage_user_created ON api_usage(user_id, created_at DESC);
CREATE INDEX idx_documents_company_year ON documents(company_id, year);
CREATE INDEX idx_financial_data_company_year ON financial_data(company_id, year);
CREATE INDEX idx_companies_name ON companies(name);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view own API usage" 
  ON api_usage FOR SELECT 
  USING (auth.uid() = user_id);

-- 関数
CREATE OR REPLACE FUNCTION check_api_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  -- ユーザープランを取得
  SELECT plan INTO v_plan FROM profiles WHERE id = p_user_id;
  
  -- プランの制限を取得
  SELECT (limits->>'api_calls')::INTEGER INTO v_limit 
  FROM subscription_plans WHERE id = v_plan;
  
  -- 無制限の場合
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- 今月の使用回数を取得
  SELECT COUNT(*) INTO v_count 
  FROM api_usage 
  WHERE user_id = p_user_id 
    AND created_at >= date_trunc('month', CURRENT_DATE);
  
  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_financial_data_updated_at
  BEFORE UPDATE ON financial_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();