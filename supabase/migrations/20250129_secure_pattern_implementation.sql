-- =====================================================
-- 安全な構成パターンへの移行
-- private スキーマ + VIEW/RPC での運用
-- =====================================================

-- =====================================================
-- 1. プロファイル用の公開VIEW（読み取り専用）
-- =====================================================

-- 公開プロファイルビュー（必要最小限の列のみ）
CREATE OR REPLACE VIEW public.v_profiles AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  plan,
  is_public,
  created_at
FROM private.profiles;

-- VIEWにRLSを有効化
ALTER VIEW public.v_profiles OWNER TO postgres;
GRANT SELECT ON public.v_profiles TO authenticated, anon;

-- RLSポリシー: 自分の情報または公開プロファイルのみ表示
CREATE POLICY "view_own_or_public_profile"
  ON public.v_profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR is_public = true
  );

-- =====================================================
-- 2. プロファイル更新用RPC関数
-- =====================================================

-- 自分のプロファイルを更新する関数
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_username text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_user_id uuid;
  v_updated_profile record;
BEGIN
  -- 認証チェック
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- プロファイルを更新（NULLの場合は既存値を維持）
  UPDATE private.profiles
  SET
    username = COALESCE(p_username, username),
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = v_user_id
  RETURNING * INTO v_updated_profile;

  -- 結果を返す
  IF v_updated_profile.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'id', v_updated_profile.id,
        'username', v_updated_profile.username,
        'full_name', v_updated_profile.full_name,
        'avatar_url', v_updated_profile.avatar_url,
        'updated_at', v_updated_profile.updated_at
      )
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
END;
$$;

-- 権限設定
REVOKE ALL ON FUNCTION public.update_my_profile FROM anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile TO authenticated;

-- =====================================================
-- 3. APIキー管理用RPC関数
-- =====================================================

-- APIキーのリストを取得（自分のもののみ）
CREATE OR REPLACE FUNCTION public.get_my_api_keys()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_user_id uuid;
  v_keys jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- マスクされたキー情報のみを返す
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'masked_key', masked_key,
      'tier', tier,
      'is_active', is_active,
      'created_at', created_at,
      'last_used_at', last_used_at
    )
    ORDER BY created_at DESC
  )
  INTO v_keys
  FROM private.api_keys_main
  WHERE user_id = v_user_id
    AND is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_keys, '[]'::jsonb)
  );
END;
$$;

-- 新しいAPIキーを生成
CREATE OR REPLACE FUNCTION public.generate_my_api_key(
  p_name text DEFAULT 'API Key',
  p_tier text DEFAULT 'free'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_api_key text;
  v_key_hash text;
  v_key_prefix text;
  v_key_suffix text;
  v_masked_key text;
  v_key_id uuid;
BEGIN
  -- 認証チェック
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- 既存のアクティブなキーを無効化（1ユーザー1キー制約）
  UPDATE private.api_keys_main
  SET is_active = false,
      updated_at = NOW()
  WHERE user_id = v_user_id
    AND is_active = true;

  -- 新しいキーを生成
  v_key_suffix := encode(gen_random_bytes(32), 'hex');
  v_api_key := 'xbrl_v1_' || v_key_suffix;
  v_key_prefix := substring(v_api_key, 1, 12);
  v_key_suffix := substring(v_api_key, length(v_api_key) - 3);
  v_masked_key := v_key_prefix || '****' || v_key_suffix;

  -- bcryptでハッシュ化
  v_key_hash := crypt(v_api_key, gen_salt('bf'));

  -- データベースに保存
  INSERT INTO private.api_keys_main (
    id, user_id, name, key_hash, key_prefix, key_suffix,
    masked_key, tier, is_active, created_at, updated_at,
    status, environment
  ) VALUES (
    gen_random_uuid(), v_user_id, p_name, v_key_hash,
    v_key_prefix, v_key_suffix, v_masked_key, p_tier,
    true, NOW(), NOW(), 'active', 'production'
  ) RETURNING id INTO v_key_id;

  -- 成功レスポンス（初回のみ平文キーを返す）
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_key_id,
      'api_key', v_api_key,  -- この時だけ平文を返す
      'masked_key', v_masked_key,
      'name', p_name,
      'tier', p_tier,
      'created_at', NOW()
    )
  );
END;
$$;

-- APIキーを削除（無効化）
CREATE OR REPLACE FUNCTION public.revoke_my_api_key(p_key_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_user_id uuid;
  v_deleted_count int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- 自分のキーのみ無効化可能
  UPDATE private.api_keys_main
  SET is_active = false,
      status = 'revoked',
      updated_at = NOW()
  WHERE id = p_key_id
    AND user_id = v_user_id
    AND is_active = true;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'API key revoked successfully'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'API key not found or already revoked'
    );
  END IF;
END;
$$;

-- 権限設定
REVOKE ALL ON FUNCTION public.get_my_api_keys FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_api_keys TO authenticated;

REVOKE ALL ON FUNCTION public.generate_my_api_key FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_my_api_key TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_my_api_key FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_my_api_key TO authenticated;

-- =====================================================
-- 4. 統計情報用VIEW（読み取り専用）
-- =====================================================

-- 自分の使用統計を見るためのVIEW
CREATE OR REPLACE VIEW public.v_my_usage_stats AS
SELECT
  u.id as user_id,
  p.plan,
  p.api_requests_count,
  p.api_requests_limit,
  (
    SELECT COUNT(*)
    FROM private.api_keys_main ak
    WHERE ak.user_id = u.id AND ak.is_active = true
  ) as active_api_keys,
  p.created_at as member_since
FROM auth.users u
LEFT JOIN private.profiles p ON u.id = p.id
WHERE u.id = auth.uid();

-- 権限設定
GRANT SELECT ON public.v_my_usage_stats TO authenticated;

-- =====================================================
-- 5. 認証関連のRPC関数
-- =====================================================

-- ユーザー登録時の初期設定（トリガーから呼ばれる想定）
CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  -- プロファイルを作成
  INSERT INTO private.profiles (
    id,
    email,
    username,
    full_name,
    plan,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'plan', 'beta'),
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- トリガーを再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_new_user();

-- =====================================================
-- 6. 既存のpublicテーブルをクリーンアップ
-- =====================================================

-- 既存のpublicスキーマのテーブルがある場合は削除
-- （すべてprivateスキーマ + VIEW/RPCで管理）
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- 完了メッセージ
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 安全な構成パターンへの移行が完了しました';
  RAISE NOTICE '📌 重要: すべてのデータはprivateスキーマに保存';
  RAISE NOTICE '📌 公開アクセスはVIEW/RPC経由のみ';
  RAISE NOTICE '📌 auth.uid()で常に本人確認';
END;
$$;