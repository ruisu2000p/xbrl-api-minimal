-- 管理者ユーザー作成SQL
-- Supabase Dashboard > SQL Editor で実行してください

-- ========================================
-- 1. usersテーブルが存在しない場合は作成
-- ========================================
CREATE TABLE IF NOT EXISTS users (
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

-- ========================================
-- 2. 管理者ユーザーを作成
-- ========================================
-- 既存の管理者を削除（必要に応じて）
DELETE FROM users WHERE email = 'admin@xbrl-api.com';

-- 新しい管理者を作成
INSERT INTO users (
  id,
  email,
  name,
  role,
  subscription_plan,
  is_active,
  join_date,
  notes
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@xbrl-api.com',
  'システム管理者',
  'admin',
  'pro',
  true,
  NOW(),
  'システム管理者アカウント - 全機能アクセス可能'
);

-- ========================================
-- 3. Supabase Auth ユーザー作成
-- ========================================
-- Supabase Dashboard > Authentication > Users で以下を実行:
-- 1. 「Create new user」をクリック
-- 2. Email: admin@xbrl-api.com
-- 3. Password: Admin@2024#XBRL
-- 4. 「Auto Confirm User」にチェック
-- 5. 「Create user」をクリック

-- ========================================
-- 4. 管理者権限の確認
-- ========================================
SELECT 
  id,
  email,
  name,
  role,
  subscription_plan,
  is_active,
  join_date
FROM users 
WHERE role = 'admin';

-- ========================================
-- 出力例：
-- id: a0000000-0000-0000-0000-000000000001
-- email: admin@xbrl-api.com
-- name: システム管理者
-- role: admin
-- subscription_plan: pro
-- is_active: true
-- ========================================