-- ===========================================
-- Markdownメタデータ統計確認
-- ===========================================

-- 1. 全体統計
-- ===========================================
SELECT 
  '📊 全体統計' as category,
  COUNT(*) as total_files,
  COUNT(DISTINCT company_id) as unique_companies,
  COUNT(DISTINCT fiscal_year) as unique_years,
  MIN(fiscal_year) as earliest_year,
  MAX(fiscal_year) as latest_year,
  SUM(file_size) / 1024 / 1024 as total_size_mb
FROM markdown_files_metadata;

-- 2. 年度別統計
-- ===========================================
SELECT 
  '📅 年度別' as category,
  fiscal_year,
  COUNT(*) as file_count,
  COUNT(DISTINCT company_id) as company_count,
  SUM(file_size) / 1024 / 1024 as total_size_mb
FROM markdown_files_metadata
WHERE fiscal_year IS NOT NULL
GROUP BY fiscal_year
ORDER BY fiscal_year DESC;

-- 3. ドキュメントタイプ別統計
-- ===========================================
SELECT 
  '📁 ドキュメントタイプ別' as category,
  document_type,
  COUNT(*) as file_count,
  COUNT(DISTINCT company_id) as company_count,
  AVG(file_size) / 1024 as avg_size_kb
FROM markdown_files_metadata
GROUP BY document_type
ORDER BY file_count DESC;

-- 4. セクションタイプ別統計
-- ===========================================
SELECT 
  '📄 セクション別' as category,
  section_type,
  COUNT(*) as file_count,
  COUNT(DISTINCT company_id) as company_count,
  MIN(file_order) as min_order,
  MAX(file_order) as max_order
FROM markdown_files_metadata
GROUP BY section_type
ORDER BY MIN(file_order);

-- 5. 企業別ファイル数TOP10
-- ===========================================
SELECT 
  '🏢 企業別TOP10' as category,
  company_id,
  company_name,
  COUNT(*) as file_count,
  COUNT(DISTINCT fiscal_year) as year_count,
  SUM(file_size) / 1024 as total_size_kb
FROM markdown_files_metadata
GROUP BY company_id, company_name
ORDER BY file_count DESC
LIMIT 10;

-- 6. コンテンツ特徴統計
-- ===========================================
SELECT 
  '📊 コンテンツ特徴' as category,
  SUM(CASE WHEN has_tables THEN 1 ELSE 0 END) as files_with_tables,
  SUM(CASE WHEN has_images THEN 1 ELSE 0 END) as files_with_images,
  SUM(CASE WHEN has_tables AND has_images THEN 1 ELSE 0 END) as files_with_both,
  COUNT(*) as total_files
FROM markdown_files_metadata;

-- 7. 最新投入データ
-- ===========================================
SELECT 
  '🆕 最新投入' as category,
  company_name,
  fiscal_year,
  section_type,
  indexed_at
FROM markdown_files_metadata
ORDER BY indexed_at DESC
LIMIT 10;

-- 8. アクセス頻度統計
-- ===========================================
SELECT 
  '👀 アクセス頻度' as category,
  company_name,
  file_name,
  access_count,
  last_accessed
FROM markdown_files_metadata
WHERE access_count > 0
ORDER BY access_count DESC
LIMIT 10;

-- 9. Storage パス構造
-- ===========================================
SELECT 
  '📂 パス構造' as category,
  SUBSTRING(storage_path FROM 1 FOR POSITION('/' IN storage_path) - 1) as root_dir,
  COUNT(*) as file_count,
  COUNT(DISTINCT company_id) as company_count
FROM markdown_files_metadata
GROUP BY SUBSTRING(storage_path FROM 1 FOR POSITION('/' IN storage_path) - 1)
ORDER BY file_count DESC;

-- 10. データ完全性チェック
-- ===========================================
SELECT 
  '✅ データ完全性' as category,
  COUNT(CASE WHEN company_id IS NULL THEN 1 END) as missing_company_id,
  COUNT(CASE WHEN file_name IS NULL THEN 1 END) as missing_file_name,
  COUNT(CASE WHEN storage_path IS NULL THEN 1 END) as missing_storage_path,
  COUNT(CASE WHEN content_preview IS NULL OR content_preview = '' THEN 1 END) as missing_preview,
  COUNT(*) as total_files
FROM markdown_files_metadata;

-- ===========================================
-- 最終サマリー
-- ===========================================
SELECT 
  '📈 システム準備状況' as status,
  CASE 
    WHEN COUNT(*) > 1000 THEN '✅ 本番稼働可能'
    WHEN COUNT(*) > 100 THEN '⚠️ テスト運用可能'
    ELSE '❌ データ投入必要'
  END as readiness,
  COUNT(*) as total_files,
  COUNT(DISTINCT company_id) as companies,
  COUNT(DISTINCT fiscal_year) as years
FROM markdown_files_metadata;