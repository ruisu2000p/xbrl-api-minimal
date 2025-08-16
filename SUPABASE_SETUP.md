# Supabase テーブルセットアップ手順

## 1. Supabase SQL Editorを開く

1. [Supabase Dashboard](https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/sql/new) にアクセス
2. 左側メニューから「SQL Editor」をクリック

## 2. profilesテーブルを作成

以下のSQLを実行してください：

```sql
-- profilesテーブルを作成
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
```

## 3. RLS（Row Level Security）を設定

```sql
-- RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Service role full access to profiles" 
  ON profiles FOR ALL 
  USING (auth.role() = 'service_role' OR auth.uid() IS NULL)
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NULL);

CREATE POLICY "Service role full access to api_usage" 
  ON api_usage FOR ALL 
  USING (auth.role() = 'service_role' OR auth.uid() IS NULL)
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NULL);
```

## 4. テストデータを挿入（オプション）

```sql
-- テストデータ
INSERT INTO profiles (email, plan, api_key) VALUES 
('demo@example.com', 'beta', 'xbrl_demo_test_key_123456789'),
('pumpkin3020@gmail.com', 'pro', 'xbrl_live_' || substr(md5(random()::text), 1, 32))
ON CONFLICT (email) DO NOTHING;
```

## 5. テーブルの確認

1. Supabase Dashboardの「Table Editor」に移動
2. `profiles`テーブルと`api_usage`テーブルが表示されることを確認

## 6. 環境変数の確認

Vercelの環境変数に以下が設定されていることを確認：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## トラブルシューティング

### テーブルが作成されない場合

1. SQL Editorでエラーメッセージを確認
2. 既存のテーブルと競合していないか確認
3. 必要に応じて`DROP TABLE IF EXISTS profiles CASCADE;`を実行してリセット

### APIキーが動作しない場合

1. `profiles`テーブルにレコードが存在するか確認
2. `api_key`カラムに値が入っているか確認
3. Vercelのログでエラーを確認

### RLSエラーが発生する場合

Service Roleキーが正しく設定されているか確認してください。

## 完全なSQLファイル

`supabase/create-profiles-table.sql`に完全なセットアップSQLがあります。