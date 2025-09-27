# 📋 APIキーシステム bcrypt移行手順書

## 実施日: 2025年1月28日

## 🎯 移行の目的
APIキーのハッシュ化をMD5からbcryptに変更し、セキュリティを強化

## ✅ 現在の状況

### 確認済み事項
- `verify_api_key_hash`関数: **bcrypt対応済み** ✅
- `create_api_key_bcrypt`関数: **存在・bcrypt使用** ✅
- `create_api_key_complete_v2`関数: **bcrypt使用** ✅
- データベース内のAPIキー: **全15個がbcrypt** ✅
- Edge Functions: **正常動作中** ✅

### 要対応事項
- `create_api_key`関数: **MD5使用** ❌ → bcryptへ変更必要

## 📝 手動マイグレーション手順

### ステップ1: Supabase SQL Editorにアクセス

1. 以下のURLにアクセス:
   ```
   https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx/sql/new
   ```

2. Supabaseにログイン

### ステップ2: マイグレーションSQLを実行

以下のSQLをコピーして、SQL Editorで実行:

```sql
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

-- 2. 新しい統一APIキー発行関数を作成
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

-- 3. インデックスの最適化
CREATE INDEX IF NOT EXISTS idx_api_keys_main_key_prefix_active
ON private.api_keys_main(key_prefix, is_active)
WHERE is_active = true;

-- 4. 関数の権限設定
GRANT EXECUTE ON FUNCTION public.issue_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_api_key_hash TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_api_key TO authenticated;

-- 5. 実行結果の確認
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
        RAISE NOTICE '⚠️ 発見: % 個の非bcryptキー。手動移行が必要です。', v_count;
    ELSE
        RAISE NOTICE '✅ すべてのキーがbcryptを使用しています。移行成功！';
    END IF;
END;
$$;
```

### ステップ3: 実行結果の確認

SQLを実行後、以下のメッセージが表示されることを確認:
- `✅ すべてのキーがbcryptを使用しています。移行成功！`

### ステップ4: 動作確認

以下のSQLで新しい関数をテスト:

```sql
-- issue_api_key関数の存在確認
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'issue_api_key';

-- create_api_key関数がbcryptを使用していることを確認
SELECT prosrc
FROM pg_proc
WHERE proname = 'create_api_key'
LIMIT 1;
```

## 🔍 検証方法

### Node.jsでの検証
```bash
node test-existing-api-functions.js
```

### 期待される結果
- verify_api_key_hash関数が正常動作
- 無効なキーが適切に拒否される
- Edge Functionsが正常に応答

## ⚠️ 注意事項

1. **既存キーへの影響**: なし（全キーが既にbcrypt）
2. **ダウンタイム**: なし（関数の置き換えのみ）
3. **ロールバック**: 必要に応じて元の関数定義に戻すことが可能

## 📚 関連ドキュメント

- [BCRYPT_IMPLEMENTATION_REPORT.md](./BCRYPT_IMPLEMENTATION_REPORT.md) - 技術詳細
- [supabase/migrations/20250128_update_api_key_to_bcrypt.sql](./supabase/migrations/20250128_update_api_key_to_bcrypt.sql) - マイグレーションファイル

## ✅ チェックリスト

- [ ] Supabase SQL Editorにアクセス
- [ ] マイグレーションSQLを実行
- [ ] 実行結果を確認（成功メッセージ）
- [ ] 動作確認テストを実行
- [ ] Edge Functionsの動作確認

---

**作成日**: 2025年1月28日
**作成者**: XBRL財務APIシステム開発チーム