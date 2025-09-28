-- =====================================================
-- 1. まず現状を確認
-- =====================================================

-- 既存の関数を確認
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- privateスキーマのテーブルを確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'private';

-- =====================================================
-- 2. 必要なテーブルが存在しない場合は作成
-- =====================================================

-- private.profilesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS private.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  plan text DEFAULT 'beta',
  is_public boolean DEFAULT false,
  api_requests_count integer DEFAULT 0,
  api_requests_limit integer DEFAULT 1000,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- private.api_keys_mainテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS private.api_keys_main (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  key_suffix text NOT NULL,
  masked_key text NOT NULL,
  tier text DEFAULT 'free',
  status text DEFAULT 'active',
  environment text DEFAULT 'production',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  last_used_at timestamptz,
  total_requests integer DEFAULT 0,
  successful_requests integer DEFAULT 0
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON private.api_keys_main(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON private.api_keys_main(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON private.api_keys_main(is_active);

-- =====================================================
-- 3. シンプルなテスト関数を作成（最小限）
-- =====================================================

-- テスト用の最小限の関数
CREATE OR REPLACE FUNCTION public.test_connection()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'Connection successful!'::text;
$$;

-- 実行してテスト
SELECT test_connection();

-- =====================================================
-- 4. 問題がなければ、本体の関数を作成
-- =====================================================

-- 自分のプロファイル情報を簡単に取得（シンプル版）
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- 現在のユーザーIDを取得
  v_user_id := auth.uid();

  -- ユーザーIDがNULLの場合
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- プロファイルを取得
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'username', p.username,
      'full_name', p.full_name,
      'plan', p.plan,
      'created_at', p.created_at
    )
  )
  INTO v_result
  FROM private.profiles p
  WHERE p.id = v_user_id;

  -- データが見つからない場合
  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;

  RETURN v_result;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION public.get_my_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_connection TO anon, authenticated;

-- =====================================================
-- 5. 動作確認
-- =====================================================

-- テスト実行
SELECT test_connection();
SELECT get_my_profile();