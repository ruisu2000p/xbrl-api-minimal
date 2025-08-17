-- ================================================
-- シンプルなカラム確認SQL
-- ================================================

-- 1. api_keysテーブルの全カラムを表示
SELECT 
    'Checking api_keys table columns:' as message;

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'api_keys'
ORDER BY ordinal_position;

-- 2. usersテーブルの全カラムを表示
SELECT 
    'Checking users table columns:' as message;

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. api_keysテーブルのサンプルデータを表示（最初の1行）
SELECT 
    'Sample data from api_keys:' as message;

SELECT * FROM api_keys LIMIT 1;

-- 4. usersテーブルのサンプルデータを表示（最初の1行）
SELECT 
    'Sample data from users:' as message;

SELECT * FROM users LIMIT 1;