-- profilesテーブルを作成するSQL
-- Supabase SQL Editorで実行してください

-- 既存のテーブルがある場合は削除（注意：データが失われます）
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS api_usage CASCADE;

-- ユーザープロファイルテーブル
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'beta' CHECK (plan IN ('beta', 'free', 'standard', 'pro')),
  api_key TEXT UNIQUE DEFAULT ('xbrl_live_' || substr(md5(random()::text), 1, 32)),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API使用状況テーブル
CREATE TABLE IF NOT EXISTS api_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON profiles(api_key);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_created ON api_usage(user_id, created_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
-- ユーザーは自分のプロファイルのみ表示可能
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid()::text = id::text OR auth.uid() IS NULL); -- NULLはサービスロール用

-- ユーザーは自分のプロファイルのみ更新可能
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid()::text = id::text OR auth.uid() IS NULL);

-- ユーザーは自分のAPI使用状況のみ表示可能
CREATE POLICY "Users can view own API usage" 
  ON api_usage FOR SELECT 
  USING (user_id IN (SELECT id FROM profiles WHERE auth.uid()::text = id::text) OR auth.uid() IS NULL);

-- サービスロールは全てのプロファイルを作成可能
CREATE POLICY "Service role can insert profiles" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() IS NULL OR auth.role() = 'service_role');

-- サービスロールは全てのAPI使用状況を記録可能
CREATE POLICY "Service role can insert API usage" 
  ON api_usage FOR INSERT 
  WITH CHECK (auth.uid() IS NULL OR auth.role() = 'service_role');

-- 更新時にupdated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- テストデータを挿入（必要に応じて）
-- INSERT INTO profiles (email, plan, api_key) VALUES 
-- ('demo@example.com', 'beta', 'xbrl_demo_test_key_123456789'),
-- ('pumpkin3020@gmail.com', 'pro', 'xbrl_live_' || substr(md5(random()::text), 1, 32));

-- テーブルが正しく作成されたか確認
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'api_usage')
ORDER BY table_name, ordinal_position;