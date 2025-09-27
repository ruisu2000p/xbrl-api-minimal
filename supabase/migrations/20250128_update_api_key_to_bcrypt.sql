-- APIキー関連関数をすべてbcryptに統一するマイグレーション

-- 1. MD5を使用しているcreate_api_key関数をbcryptに変更
CREATE OR REPLACE FUNCTION public.create_api_key(
    p_user_id UUID,
    p_name TEXT DEFAULT 'API Key',
    p_environment TEXT DEFAULT 'production'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_key_prefix TEXT := 'xbrl_v1_';
  v_key_suffix TEXT;
  v_key_hash TEXT;
  v_masked_key TEXT;
  v_api_key TEXT;
  v_key_id UUID;
BEGIN
  -- 32文字のランダムなサフィックスを生成
  v_key_suffix := encode(gen_random_bytes(16), 'hex');

  -- 完全なAPIキーを生成
  v_api_key := v_key_prefix || v_key_suffix;

  -- bcryptでハッシュ化
  v_key_hash := extensions.crypt(v_api_key, extensions.gen_salt('bf'));

  -- マスクされたキーを作成
  v_masked_key := v_key_prefix || '***' || substring(v_key_suffix, length(v_key_suffix) - 3, 4);

  -- APIキーをprivate.api_keys_mainテーブルに保存
  INSERT INTO private.api_keys_main (
    id, name, key_prefix, key_hash, key_suffix,
    masked_key, is_active, user_id, created_at, updated_at,
    status, environment, tier
  ) VALUES (
    gen_random_uuid(), p_name, substring(v_api_key, 1, 8), v_key_hash, substring(v_key_suffix, 1, 4),
    v_masked_key, TRUE, p_user_id, NOW(), NOW(),
    'active', p_environment, 'free'
  ) RETURNING id INTO v_key_id;

  -- 完全なAPIキーを返す
  RETURN v_api_key;
END;
$$;

COMMENT ON FUNCTION public.create_api_key IS 'APIキーを生成してbcryptハッシュで保存する関数';

-- 2. verify_api_key_hash関数が正しくbcryptを使用していることを確認
-- (既に対応済みですが、念のため再定義)
CREATE OR REPLACE FUNCTION public.verify_api_key_hash(
    auth_header text,
    OUT key_id uuid,
    OUT user_tier text,
    OUT tier_limit text
)
RETURNS SETOF record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    raw_key text;
    v_key_prefix text;
    v_key_secret text;
    found_record record;
BEGIN
    -- Authorization ヘッダーが null または空の場合は早期リターン
    IF auth_header IS NULL OR trim(auth_header) = '' THEN
        RETURN;
    END IF;

    -- "Bearer " プレフィックスを削除
    raw_key := trim(regexp_replace(auth_header, '^Bearer\s+', '', 'i'));

    -- キーが無効な場合は早期リターン
    IF raw_key IS NULL OR length(raw_key) < 10 THEN
        RETURN;
    END IF;

    -- キーからプレフィックス（最初の8文字）を抽出
    v_key_prefix := substring(raw_key, 1, 8);
    v_key_secret := substring(raw_key, 9);

    -- プレフィックスでAPI キーを検索
    SELECT ak.id, ak.key_hash, ak.tier, ak.is_active
    INTO found_record
    FROM private.api_keys_main ak
    WHERE ak.key_prefix = v_key_prefix
      AND ak.is_active = true
    LIMIT 1;

    -- キーが見つからない場合は早期リターン
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- bcryptでハッシュを検証（平文キー全体をチェック）
    IF extensions.crypt(raw_key, found_record.key_hash) = found_record.key_hash THEN
        key_id := found_record.id;
        user_tier := found_record.tier;
        tier_limit := found_record.tier;

        -- 最終使用日時を更新（非同期で実行）
        UPDATE private.api_keys_main
        SET last_used_at = NOW(),
            total_requests = COALESCE(total_requests, 0) + 1,
            successful_requests = COALESCE(successful_requests, 0) + 1
        WHERE id = found_record.id;

        RETURN NEXT;
    END IF;

    RETURN;
END;
$$;

COMMENT ON FUNCTION public.verify_api_key_hash IS 'APIキーをbcryptハッシュで検証する関数';

-- 3. 既存のMD5ハッシュキーがある場合の移行処理（必要に応じて実行）
-- 注：現在すべてのキーがbcryptなので実際には不要ですが、念のため
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- bcrypt以外のハッシュを持つキーの数をカウント
    SELECT COUNT(*)
    INTO v_count
    FROM private.api_keys_main
    WHERE key_hash NOT LIKE '$2a$%'
      AND key_hash NOT LIKE '$2b$%'
      AND key_hash NOT LIKE '$2y$%';

    IF v_count > 0 THEN
        RAISE NOTICE 'Found % non-bcrypt keys. Manual migration required.', v_count;
        -- 手動での再発行が必要
    ELSE
        RAISE NOTICE 'All keys are already using bcrypt. No migration needed.';
    END IF;
END;
$$;

-- 4. 新しいAPIキー発行用のヘルパー関数を作成（統一インターフェース）
CREATE OR REPLACE FUNCTION public.issue_api_key(
    p_user_id UUID,
    p_name TEXT DEFAULT 'API Key',
    p_tier TEXT DEFAULT 'free',
    p_description TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_api_key TEXT;
    v_key_hash TEXT;
    v_key_id UUID;
    v_key_prefix TEXT;
    v_key_suffix TEXT;
    v_masked_key TEXT;
BEGIN
    -- ユーザーの認証チェック
    IF auth.uid() IS NULL AND current_user != 'postgres' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required'
        );
    END IF;

    -- ユーザーID一致チェック（Service Role以外）
    IF current_user != 'postgres' AND auth.uid() != p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized'
        );
    END IF;

    -- APIキーの生成
    v_key_suffix := encode(gen_random_bytes(32), 'hex');
    v_api_key := 'xbrl_v1_' || v_key_suffix;
    v_key_prefix := substring(v_api_key, 1, 8);

    -- bcryptでハッシュ化
    v_key_hash := extensions.crypt(v_api_key, extensions.gen_salt('bf'));

    -- マスクキー作成
    v_masked_key := v_key_prefix || '***' || substring(v_key_suffix, length(v_key_suffix) - 3, 4);

    -- 既存のアクティブなキーを無効化（1ユーザー1キー制約）
    UPDATE private.api_keys_main
    SET is_active = false,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND is_active = true;

    -- 新しいキーを保存
    INSERT INTO private.api_keys_main (
        id, user_id, name, key_hash, key_prefix, key_suffix,
        masked_key, tier, description, is_active,
        created_at, updated_at, status, environment
    ) VALUES (
        gen_random_uuid(), p_user_id, p_name, v_key_hash,
        v_key_prefix, substring(v_key_suffix, 1, 4),
        v_masked_key, p_tier, p_description, true,
        NOW(), NOW(), 'active', 'production'
    ) RETURNING id INTO v_key_id;

    -- 成功レスポンス
    RETURN jsonb_build_object(
        'success', true,
        'api_key', v_api_key,
        'key_id', v_key_id,
        'key_prefix', v_key_prefix,
        'masked_key', v_masked_key,
        'tier', p_tier,
        'name', p_name,
        'created_at', NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.issue_api_key IS '統一されたAPIキー発行関数（bcryptハッシュ使用）';

-- 5. インデックスの最適化
CREATE INDEX IF NOT EXISTS idx_api_keys_main_key_prefix_active
ON private.api_keys_main(key_prefix, is_active)
WHERE is_active = true;

-- 6. 関数の権限設定
GRANT EXECUTE ON FUNCTION public.issue_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key_hash TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_api_key TO authenticated;

-- マイグレーション完了メッセージ
DO $$
BEGIN
    RAISE NOTICE 'APIキー関数のbcrypt統一マイグレーションが完了しました。';
    RAISE NOTICE '新規APIキーは issue_api_key() 関数を使用してください。';
END;
$$;