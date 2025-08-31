-- XBRL API Tables Setup
-- Run this SQL in Supabase SQL Editor

-- 1. api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  key_suffix text NOT NULL,
  masked_key text NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  rate_limit_per_minute integer DEFAULT 100,
  rate_limit_per_hour integer DEFAULT 10000,
  rate_limit_per_day integer DEFAULT 100000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. usage_counters table
CREATE TABLE IF NOT EXISTS usage_counters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  minute_count integer DEFAULT 0,
  hour_count integer DEFAULT 0,
  day_count integer DEFAULT 0,
  total_count bigint DEFAULT 0,
  last_reset_minute timestamp with time zone DEFAULT now(),
  last_reset_hour timestamp with time zone DEFAULT now(),
  last_reset_day timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. companies table (sample data)
CREATE TABLE IF NOT EXISTS companies (
  id text PRIMARY KEY,
  name text NOT NULL,
  ticker text,
  sector text,
  market text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. incr_usage function
CREATE OR REPLACE FUNCTION incr_usage(key_id uuid)
RETURNS void AS $$
BEGIN
  -- First check if the record exists
  IF NOT EXISTS (SELECT 1 FROM usage_counters WHERE api_key_id = key_id) THEN
    -- Create a new record if it doesn't exist
    INSERT INTO usage_counters (api_key_id, minute_count, hour_count, day_count, total_count)
    VALUES (key_id, 1, 1, 1, 1);
  ELSE
    -- Update existing record
    UPDATE usage_counters
    SET 
      minute_count = minute_count + 1,
      hour_count = hour_count + 1,
      day_count = day_count + 1,
      total_count = total_count + 1,
      updated_at = now()
    WHERE api_key_id = key_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Insert sample companies
INSERT INTO companies (id, name, ticker, sector, market) VALUES
  ('S100L777', 'トヨタ自動車株式会社', '7203', '輸送用機器', '東証プライム'),
  ('S100L778', 'ソニーグループ株式会社', '6758', '電気機器', '東証プライム'),
  ('S100L779', '任天堂株式会社', '7974', 'その他製品', '東証プライム'),
  ('S100L780', '株式会社キーエンス', '6861', '電気機器', '東証プライム'),
  ('S100L781', 'ソフトバンクグループ株式会社', '9984', '情報・通信業', '東証プライム'),
  ('S100L782', '株式会社リクルートホールディングス', '6098', 'サービス業', '東証プライム'),
  ('S100L783', '株式会社日立製作所', '6501', '電気機器', '東証プライム'),
  ('S100L784', '株式会社三菱UFJフィナンシャル・グループ', '8306', '銀行業', '東証プライム'),
  ('S100L785', '日本電信電話株式会社', '9432', '情報・通信業', '東証プライム'),
  ('S100L786', '中外製薬株式会社', '4519', '医薬品', '東証プライム')
ON CONFLICT (id) DO NOTHING;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_counters_api_key_id ON usage_counters(api_key_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all API keys" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all usage counters" ON usage_counters
  FOR ALL USING (auth.role() = 'service_role');

-- Done! Your tables are ready.