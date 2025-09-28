# 🚀 今すぐ実行

## ステップ 1: Supabase Dashboardを開く
https://supabase.com/dashboard

## ステップ 2: SQL Editorへ
左メニュー → 「SQL Editor」 → 「New Query」

## ステップ 3: 以下のSQLをコピー＆ペースト

```sql
-- =====================================================
-- 安全な構成パターンへの移行（修正版）
-- VIEWにはRLSを適用できないため、適切な方法で実装
-- =====================================================

-- まず既存のオブジェクトをクリーンアップ
DROP VIEW IF EXISTS public.v_profiles CASCADE;
DROP VIEW IF EXISTS public.v_my_usage_stats CASCADE;
DROP FUNCTION IF EXISTS public.update_my_profile CASCADE;
DROP FUNCTION IF EXISTS public.get_my_api_keys CASCADE;
DROP FUNCTION IF EXISTS public.generate_my_api_key CASCADE;
DROP FUNCTION IF EXISTS public.revoke_my_api_key CASCADE;

-- =====================================================
-- 1. プロファイル用の公開VIEW（読み取り専用）
-- VIEWは自動的にセキュアになる（auth.uid()での制限を含む）
-- =====================================================

-- 公開プロファイルビュー（必要最小限の列のみ）
CREATE OR REPLACE VIEW public.v_profiles AS
SELECT
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.plan,
  p.is_public,
  p.created_at
FROM private.profiles p
WHERE
  p.id = auth.uid()  -- 自分のデータのみ
  OR p.is_public = true;  -- または公開プロファイル

-- 権限設定
GRANT SELECT ON public.v_profiles TO authenticated;
GRANT SELECT ON public.v_profiles TO anon;

COMMENT ON VIEW public.v_profiles IS '公開プロファイル情報（読み取り専用）';

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

  -- プロファイルが存在しない場合は作成
  INSERT INTO private.profiles (id, email, username, full_name, avatar_url)
  SELECT
    v_user_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    COALESCE(p_username, split_part((SELECT email FROM auth.users WHERE id = v_user_id), '@', 1)),
    p_full_name,
    p_avatar_url
  ON CONFLICT (id) DO NOTHING;

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
      'error', 'Profile update failed'
    );
  END IF;
END;
$$;

-- 権限設定
REVOKE ALL ON FUNCTION public.update_my_profile FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_my_profile TO authenticated;

COMMENT ON FUNCTION public.update_my_profile IS '自分のプロファイルを更新';

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

-- 権限設定
REVOKE ALL ON FUNCTION public.get_my_api_keys FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_api_keys TO authenticated;

COMMENT ON FUNCTION public.get_my_api_keys IS '自分のAPIキー一覧を取得';

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
  v_random_hex text;
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
  v_random_hex := encode(gen_random_bytes(32), 'hex');
  v_api_key := 'xbrl_v1_' || v_random_hex;
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
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to generate API key: ' || SQLERRM
    );
END;
$$;

-- 権限設定
REVOKE ALL ON FUNCTION public.generate_my_api_key FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_my_api_key TO authenticated;

COMMENT ON FUNCTION public.generate_my_api_key IS '新しいAPIキーを生成';

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
REVOKE ALL ON FUNCTION public.revoke_my_api_key FROM anon, public;
GRANT EXECUTE ON FUNCTION public.revoke_my_api_key TO authenticated;

COMMENT ON FUNCTION public.revoke_my_api_key IS 'APIキーを無効化';

-- =====================================================
-- 4. 統計情報用VIEW（読み取り専用）
-- =====================================================

-- 自分の使用統計を見るためのVIEW
CREATE OR REPLACE VIEW public.v_my_usage_stats AS
SELECT
  p.id as user_id,
  p.email,
  p.plan,
  p.api_requests_count,
  p.api_requests_limit,
  (
    SELECT COUNT(*)
    FROM private.api_keys_main ak
    WHERE ak.user_id = p.id AND ak.is_active = true
  ) as active_api_keys,
  p.created_at as member_since
FROM private.profiles p
WHERE p.id = auth.uid();  -- 自分の統計のみ

-- 権限設定
GRANT SELECT ON public.v_my_usage_stats TO authenticated;

COMMENT ON VIEW public.v_my_usage_stats IS '自分の使用統計情報';

-- =====================================================
-- 5. 認証関連のトリガー（既存の場合は更新）
-- =====================================================

-- ユーザー登録時の初期設定
CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  -- プロファイルが存在しない場合のみ作成
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
-- 6. テスト用のヘルパー関数
-- =====================================================

-- 自分のプロファイル情報を簡単に取得
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
BEGIN
  SELECT * INTO v_profile
  FROM v_profiles
  WHERE id = auth.uid();

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(v_profile)::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile TO authenticated;

-- =====================================================
-- 完了メッセージ
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 安全な構成パターンへの移行が完了しました';
  RAISE NOTICE '📌 重要: すべてのデータはprivateスキーマに保存';
  RAISE NOTICE '📌 公開アクセスはVIEW/RPC経由のみ';
  RAISE NOTICE '📌 auth.uid()で常に本人確認';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 動作確認用コマンド:';
  RAISE NOTICE 'SELECT * FROM v_profiles WHERE id = auth.uid();';
  RAISE NOTICE 'SELECT get_my_profile();';
  RAISE NOTICE 'SELECT get_my_api_keys();';
END;
$$;
```

## ステップ 4: 「Run」ボタンをクリック

## ステップ 5: 動作確認

```sql
-- テスト1: プロファイル取得
SELECT get_my_profile();

-- テスト2: APIキー一覧
SELECT get_my_api_keys();

-- テスト3: APIキー生成（重要：api_keyの値をコピー！）
SELECT generate_my_api_key('本番用キー', 'free');
```