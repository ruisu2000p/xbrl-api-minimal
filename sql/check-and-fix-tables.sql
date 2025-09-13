-- ================================================
-- テーブル構造の確認と修正
-- ================================================

-- 1. usersテーブルの構造を確認
SELECT 
    '=== USERS TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. api_keysテーブルの構造を確認
SELECT 
    '=== API_KEYS TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 3. usersテーブルにplanカラムがない場合は追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'plan'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';
        RAISE NOTICE 'Added plan column to users table';
    END IF;
END $$;

-- 4. デモユーザーの作成（planカラムなしバージョン）
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- planカラムが存在するか確認
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'plan'
        AND table_schema = 'public'
    ) THEN
        -- planカラムがある場合
        INSERT INTO users (email, name, plan)
        VALUES ('demo@example.com', 'Demo User', 'pro')
        ON CONFLICT (email) DO UPDATE
        SET plan = 'pro';
    ELSE
        -- planカラムがない場合
        INSERT INTO users (email, name)
        VALUES ('demo@example.com', 'Demo User')
        ON CONFLICT (email) DO NOTHING;
    END IF;
    
    -- ユーザーIDを取得
    SELECT id INTO v_user_id FROM users WHERE email = 'demo@example.com' LIMIT 1;
    RAISE NOTICE 'Demo user ID: %', v_user_id;
END $$;

-- 5. APIキーの挿入（カラム名を動的に判定）
DO $$
DECLARE
    v_user_id UUID;
    v_api_key_value TEXT := 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830';
    v_has_api_key_col BOOLEAN;
    v_has_key_col BOOLEAN;
BEGIN
    -- デモユーザーのIDを取得
    SELECT id INTO v_user_id FROM users WHERE email = 'demo@example.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Demo user not found, creating...';
        INSERT INTO users (email, name)
        VALUES ('demo@example.com', 'Demo User')
        RETURNING id INTO v_user_id;
    END IF;
    
    -- カラムの存在を確認
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'api_key' AND table_schema = 'public'
    ) INTO v_has_api_key_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'key' AND table_schema = 'public'
    ) INTO v_has_key_col;
    
    -- 適切なカラムにAPIキーを挿入
    IF v_has_api_key_col THEN
        -- api_keyカラムを使用
        EXECUTE format('
            INSERT INTO api_keys (api_key, user_id, is_active)
            VALUES (%L, %L, true)
            ON CONFLICT (api_key) DO UPDATE
            SET is_active = true, user_id = %L',
            v_api_key_value, v_user_id, v_user_id
        );
        RAISE NOTICE 'API key inserted/updated in api_key column';
    ELSIF v_has_key_col THEN
        -- keyカラムを使用
        EXECUTE format('
            INSERT INTO api_keys (key, user_id, is_active)
            VALUES (%L, %L, true)
            ON CONFLICT (key) DO UPDATE
            SET is_active = true, user_id = %L',
            v_api_key_value, v_user_id, v_user_id
        );
        RAISE NOTICE 'API key inserted/updated in key column';
    ELSE
        RAISE NOTICE 'Neither api_key nor key column found in api_keys table';
    END IF;
END $$;

-- 6. 結果の確認
SELECT 
    '=== VERIFICATION ===' as info;

-- ユーザーの確認
SELECT 
    'Demo User' as check_item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE email = 'demo@example.com')
        THEN 'EXISTS'
        ELSE 'NOT FOUND'
    END as status;

-- APIキーの確認（どちらのカラム名でも対応）
WITH api_key_check AS (
    SELECT 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'api_keys' AND column_name = 'api_key'
            ) THEN 'api_key'
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'api_keys' AND column_name = 'key'
            ) THEN 'key'
            ELSE 'unknown'
        END as key_column
)
SELECT 
    'API Key' as check_item,
    key_column as column_name,
    CASE 
        WHEN key_column = 'api_key' AND EXISTS (
            SELECT 1 FROM api_keys 
            WHERE api_key = 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830'
        ) THEN 'EXISTS'
        WHEN key_column = 'key' AND EXISTS (
            SELECT 1 FROM api_keys 
            WHERE key = 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830'
        ) THEN 'EXISTS'
        ELSE 'NOT FOUND'
    END as status
FROM api_key_check;

-- 7. 最終確認 - APIキーの詳細を表示
SELECT 
    '=== API KEY DETAILS ===' as info;

-- 動的にカラム名を使用して結果を表示
DO $$
DECLARE
    v_sql TEXT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'api_key'
    ) THEN
        v_sql := 'SELECT ak.api_key as key_value, u.email, ak.is_active, ak.user_id 
                  FROM api_keys ak 
                  LEFT JOIN users u ON ak.user_id = u.id 
                  WHERE ak.api_key = ''xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830''';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'key'
    ) THEN
        v_sql := 'SELECT ak.key as key_value, u.email, ak.is_active, ak.user_id 
                  FROM api_keys ak 
                  LEFT JOIN users u ON ak.user_id = u.id 
                  WHERE ak.key = ''xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830''';
    ELSE
        v_sql := 'SELECT ''No api_key or key column found'' as error';
    END IF;
    
    EXECUTE v_sql;
END $$;