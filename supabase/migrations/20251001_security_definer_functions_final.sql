-- ===================================================================
-- SECURITY DEFINER関数 - 最終版（すべての修正を統合）
-- ===================================================================
-- このマイグレーションは以下の問題をすべて修正します:
-- 1. 変数名衝突（key_prefix → v_key_prefix）
-- 2. 型キャスト（varchar → text for pgcrypto）
-- 3. pepper削除（一貫したハッシュ処理）
-- ===================================================================

-- pgcrypto拡張が有効か確認
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- 1. APIキー検証関数（bcrypt版） - 完全修正版
-- ===================================================================
CREATE OR REPLACE FUNCTION private.verify_api_key_secure(
  api_key_input text
)
RETURNS TABLE (
  user_id uuid,
  key_id uuid,
  tier text,
  is_active boolean
)
SECURITY DEFINER
SET search_path = public, private
LANGUAGE plpgsql
AS $$
DECLARE
  key_record record;
  v_key_prefix text := substring(api_key_input from 1 for 12);
BEGIN
  -- プレフィックスでフィルタリング
  FOR key_record IN
    SELECT
      ak.id,
      ak.user_id,
      ak.tier,
      ak.is_active,
      ak.key_hash::text as key_hash  -- 明示的にtext型にキャスト
    FROM private.api_keys ak
    WHERE ak.key_prefix = v_key_prefix  -- v_プレフィックスで衝突回避
      AND ak.is_active = true
  LOOP
    -- bcryptでハッシュを検証（pgcryptoのcrypt関数）
    -- 両方の引数をtext型に明示的にキャスト
    IF key_record.key_hash = crypt(api_key_input::text, key_record.key_hash) THEN
      -- 最終使用日時を更新
      UPDATE private.api_keys
      SET last_used_at = now()
      WHERE id = key_record.id;

      -- 結果を返す
      RETURN QUERY
      SELECT
        key_record.user_id,
        key_record.id,
        key_record.tier,
        key_record.is_active;
      RETURN;
    END IF;
  END LOOP;

  -- マッチするキーが見つからない場合は空の結果を返す
  RETURN;
END;
$$;

COMMENT ON FUNCTION private.verify_api_key_secure IS
'APIキーを検証し、有効な場合はユーザー情報を返す。変数名衝突と型キャストの問題を修正済み。';

-- ===================================================================
-- 2. APIキー一覧取得関数
-- ===================================================================
CREATE OR REPLACE FUNCTION private.list_api_keys_secure()
RETURNS TABLE (
  id uuid,
  name text,
  key_prefix text,
  tier text,
  is_active boolean,
  created_at timestamptz,
  last_used_at timestamptz
)
SECURITY DEFINER
SET search_path = public, private
LANGUAGE plpgsql
AS $$
BEGIN
  -- 認証チェック
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ユーザー自身のAPIキーのみを返す
  RETURN QUERY
  SELECT
    ak.id,
    ak.name,
    ak.key_prefix,
    ak.tier,
    ak.is_active,
    ak.created_at,
    ak.last_used_at
  FROM private.api_keys ak
  WHERE ak.user_id = auth.uid()
    AND ak.is_active = true
  ORDER BY ak.created_at DESC;
END;
$$;

COMMENT ON FUNCTION private.list_api_keys_secure IS
'認証されたユーザーのAPIキー一覧を取得。';

-- ===================================================================
-- 3. APIキー作成関数
-- ===================================================================
CREATE OR REPLACE FUNCTION private.create_api_key_secure(
  key_name text,
  key_hash_input text,
  key_prefix_input text,
  key_suffix_input text DEFAULT NULL,
  tier_input text DEFAULT 'free'
)
RETURNS TABLE (
  id uuid,
  name text,
  key_prefix text,
  tier text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public, private
LANGUAGE plpgsql
AS $$
DECLARE
  new_key_id uuid;
BEGIN
  -- 認証チェック
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 既存のアクティブなキーを無効化
  UPDATE private.api_keys
  SET is_active = false
  WHERE user_id = auth.uid()
    AND is_active = true;

  -- 新しいキーを作成
  INSERT INTO private.api_keys (
    user_id,
    name,
    key_hash,
    key_prefix,
    key_suffix,
    tier,
    is_active
  ) VALUES (
    auth.uid(),
    key_name,
    key_hash_input,
    key_prefix_input,
    key_suffix_input,
    tier_input,
    true
  )
  RETURNING private.api_keys.id INTO new_key_id;

  -- 作成したキー情報を返す
  RETURN QUERY
  SELECT
    ak.id,
    ak.name,
    ak.key_prefix,
    ak.tier,
    ak.created_at
  FROM private.api_keys ak
  WHERE ak.id = new_key_id;
END;
$$;

COMMENT ON FUNCTION private.create_api_key_secure IS
'認証されたユーザーの新しいAPIキーを作成。既存のキーは自動的に無効化される。';

-- ===================================================================
-- 4. APIキー無効化関数
-- ===================================================================
CREATE OR REPLACE FUNCTION private.revoke_api_key_secure(
  key_id_input uuid
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, private
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows int;
BEGIN
  -- 認証チェック
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- ユーザー自身のキーのみを無効化
  UPDATE private.api_keys
  SET is_active = false
  WHERE id = key_id_input
    AND user_id = auth.uid()
    AND is_active = true;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  RETURN affected_rows > 0;
END;
$$;

COMMENT ON FUNCTION private.revoke_api_key_secure IS
'認証されたユーザーの指定されたAPIキーを無効化。';

-- ===================================================================
-- 5. 関数の実行権限を設定
-- ===================================================================

-- 認証されたユーザーに実行権限を付与
GRANT EXECUTE ON FUNCTION private.verify_api_key_secure(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.list_api_keys_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION private.create_api_key_secure(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.revoke_api_key_secure(uuid) TO authenticated;

-- anon（未認証）ユーザーにはverify_api_key_secureのみ実行可能
GRANT EXECUTE ON FUNCTION private.verify_api_key_secure(text) TO anon;

-- ===================================================================
-- 完了メッセージ
-- ===================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ SECURITY DEFINER functions created successfully (FINAL VERSION)';
  RAISE NOTICE '   - private.verify_api_key_secure: API key verification (fixed variable collision + type cast)';
  RAISE NOTICE '   - private.list_api_keys_secure: List user API keys';
  RAISE NOTICE '   - private.create_api_key_secure: Create new API key';
  RAISE NOTICE '   - private.revoke_api_key_secure: Revoke API key';
END $$;
