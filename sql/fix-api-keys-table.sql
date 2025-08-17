-- ================================================
-- APIキーテーブルの修正（実際の構造に合わせる）
-- ================================================

-- 1. 現在のテーブル構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 2. カラム名を確認して修正
-- "key"カラムが存在しない場合、正しいカラム名を使用

-- オプション1: api_keyカラムが存在する場合
DO $$
BEGIN
    -- api_keyカラムが存在するか確認
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' 
        AND column_name = 'api_key'
        AND table_schema = 'public'
    ) THEN
        -- api_keyカラムを使用してデータを挿入
        INSERT INTO api_keys (
            api_key,
            user_id,
            plan,
            is_active,
            expires_at,
            monthly_limit
        )
        SELECT 
            'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830',
            u.id,
            'pro',
            true,
            now() + interval '1 year',
            999999
        FROM users u
        WHERE u.email = 'demo@example.com'
        ON CONFLICT (api_key) DO UPDATE
        SET is_active = true,
            expires_at = now() + interval '1 year',
            plan = 'pro';
        
        RAISE NOTICE 'APIキーをapi_keyカラムに挿入しました';
    END IF;
END $$;

-- オプション2: keyカラムを追加する必要がある場合
DO $$
BEGIN
    -- keyカラムが存在しない場合は追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' 
        AND column_name = 'key'
        AND table_schema = 'public'
    ) THEN
        -- api_keyカラムが存在する場合はそれをkeyにリネーム
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'api_keys' 
            AND column_name = 'api_key'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE api_keys RENAME COLUMN api_key TO key;
            RAISE NOTICE 'api_keyカラムをkeyにリネームしました';
        ELSE
            -- どちらも存在しない場合は新規追加
            ALTER TABLE api_keys ADD COLUMN key TEXT UNIQUE;
            RAISE NOTICE 'keyカラムを追加しました';
        END IF;
    END IF;
END $$;

-- 3. 実際のカラム名を使用してAPIキーを挿入（汎用版）
-- まずデモユーザーを確認/作成
INSERT INTO users (email, name, plan)
VALUES ('demo@example.com', 'Demo User', 'pro')
ON CONFLICT (email) DO UPDATE
SET plan = 'pro',
    updated_at = now();

-- APIキーを挿入（カラム名に応じて調整）
DO $$
DECLARE
    v_user_id UUID;
    v_api_key_value TEXT := 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';
BEGIN
    -- デモユーザーのIDを取得
    SELECT id INTO v_user_id FROM users WHERE email = 'demo@example.com' LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- api_keyカラムが存在する場合
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'api_keys' 
            AND column_name = 'api_key'
            AND table_schema = 'public'
        ) THEN
            -- 既存のレコードを確認
            IF NOT EXISTS (
                SELECT 1 FROM api_keys WHERE api_key = v_api_key_value
            ) THEN
                INSERT INTO api_keys (api_key, user_id, is_active)
                VALUES (v_api_key_value, v_user_id, true);
                RAISE NOTICE 'APIキーをapi_keyカラムに挿入しました';
            ELSE
                UPDATE api_keys 
                SET is_active = true, user_id = v_user_id
                WHERE api_key = v_api_key_value;
                RAISE NOTICE 'APIキーを更新しました';
            END IF;
        -- keyカラムが存在する場合
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'api_keys' 
            AND column_name = 'key'
            AND table_schema = 'public'
        ) THEN
            -- 既存のレコードを確認
            IF NOT EXISTS (
                SELECT 1 FROM api_keys WHERE key = v_api_key_value
            ) THEN
                INSERT INTO api_keys (key, user_id, is_active)
                VALUES (v_api_key_value, v_user_id, true);
                RAISE NOTICE 'APIキーをkeyカラムに挿入しました';
            ELSE
                UPDATE api_keys 
                SET is_active = true, user_id = v_user_id
                WHERE key = v_api_key_value;
                RAISE NOTICE 'APIキーを更新しました';
            END IF;
        ELSE
            RAISE NOTICE 'api_keyまたはkeyカラムが見つかりません';
        END IF;
    ELSE
        RAISE NOTICE 'デモユーザーが見つかりません';
    END IF;
END $$;

-- 4. 確認クエリ（どちらのカラム名でも動作）
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'api_key')
        THEN 'api_key'
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key')
        THEN 'key'
        ELSE 'unknown'
    END as key_column_name,
    COUNT(*) as total_records
FROM api_keys;

-- APIキーの存在確認（両方のカラム名に対応）
SELECT * FROM api_keys 
WHERE (
    (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'api_key') 
     AND api_key = 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830')
    OR
    (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key') 
     AND key = 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830')
);