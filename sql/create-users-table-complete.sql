-- ============================================
-- Complete Users Table Setup for Supabase
-- ============================================
-- このSQLをSupabase SQL Editorで実行してください
-- URL: https://supabase.com/dashboard/project/zxzyidqrvzfzhicfuhlo/sql/new

-- 1. UUID拡張機能を有効化（必要な場合）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 既存のusersテーブルを削除（必要に応じて）
-- DROP TABLE IF EXISTS public.users CASCADE;

-- 3. usersテーブルを作成
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  subscription_plan VARCHAR(20) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'standard', 'pro')),
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  total_api_calls INTEGER DEFAULT 0,
  monthly_api_calls INTEGER DEFAULT 0,
  subscription_start_date DATE,
  subscription_end_date DATE,
  stripe_customer_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  suspension_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- 5. Row Level Security (RLS) を有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Service Roleに全権限を付与するポリシー
CREATE POLICY "Service role can do everything" ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. 管理者ユーザーを作成
-- 既存の管理者を削除
DELETE FROM public.users WHERE email = 'admin@xbrl-api.com';

-- 新しい管理者を作成
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  subscription_plan,
  is_active,
  join_date,
  notes
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'admin@xbrl-api.com',
  'システム管理者',
  'admin',
  'pro',
  true,
  NOW(),
  'システム管理者アカウント - 全機能アクセス可能'
);

-- 8. テストユーザーを作成（デモ用）
INSERT INTO public.users (email, name, role, subscription_plan, is_active)
VALUES 
  ('user1@example.com', 'テストユーザー1', 'user', 'free', true),
  ('user2@example.com', 'テストユーザー2', 'user', 'standard', true),
  ('user3@example.com', 'テストユーザー3', 'user', 'pro', true)
ON CONFLICT (email) DO NOTHING;

-- 9. 他の必要なテーブルも作成
-- API使用ログテーブル
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理者アクティビティログテーブル
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id VARCHAR(255),
  action_type VARCHAR(100),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APIエンドポイント統計テーブル
CREATE TABLE IF NOT EXISTS public.api_endpoint_statistics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  endpoint VARCHAR(255),
  total_calls INTEGER DEFAULT 0,
  avg_response_time_ms FLOAT,
  error_rate FLOAT,
  last_called_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 収益サマリーテーブル
CREATE TABLE IF NOT EXISTS public.revenue_summary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  month VARCHAR(7), -- YYYY-MM format
  revenue DECIMAL(10, 2),
  user_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- システムメトリクステーブル
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  metric_type VARCHAR(50),
  metric_value FLOAT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 作成されたテーブルとデータを確認
SELECT 'Users Table:' as info;
SELECT id, email, name, role, subscription_plan, is_active 
FROM public.users 
ORDER BY created_at DESC;

SELECT '' as separator;
SELECT 'Admin Users:' as info;
SELECT id, email, name, role 
FROM public.users 
WHERE role = 'admin';

SELECT '' as separator;
SELECT 'Table Statistics:' as info;
SELECT 
  (SELECT COUNT(*) FROM public.users) as total_users,
  (SELECT COUNT(*) FROM public.users WHERE role = 'admin') as admin_count,
  (SELECT COUNT(*) FROM public.users WHERE is_active = true) as active_users;