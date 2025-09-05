-- ===========================================
-- financial_documents テーブル構造確認
-- ===========================================

-- 1. テーブルが存在するか確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'financial_documents'
) as table_exists;

-- 2. 既存のテーブル構造を確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'financial_documents' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 既存データ数を確認
SELECT COUNT(*) as record_count FROM financial_documents;

-- 4. サンプルデータを確認（5件）
SELECT * FROM financial_documents LIMIT 5;