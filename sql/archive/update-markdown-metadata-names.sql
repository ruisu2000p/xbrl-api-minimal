-- markdown_files_metadataテーブルのcompany_nameを
-- companiesテーブルから一括更新するSQL

-- 1. 更新前の状態確認
SELECT 
  COUNT(*) as total_records,
  COUNT(company_name) as with_name,
  COUNT(*) - COUNT(company_name) as without_name
FROM markdown_files_metadata;

-- 2. companiesテーブルの確認
SELECT COUNT(*) as total_companies FROM companies;

-- 3. 照合可能なレコード数の確認
SELECT COUNT(DISTINCT m.company_id) as matching_companies
FROM markdown_files_metadata m
INNER JOIN companies c ON m.company_id = c.id
WHERE m.company_name IS NULL OR m.company_name = '';

-- 4. 一括更新（これがメインのクエリ）
UPDATE markdown_files_metadata AS m
SET company_name = c.name
FROM companies AS c
WHERE m.company_id = c.id
AND (m.company_name IS NULL OR m.company_name = '');

-- 5. 更新後の確認
SELECT 
  COUNT(*) as total_records,
  COUNT(company_name) as with_name,
  COUNT(*) - COUNT(company_name) as without_name
FROM markdown_files_metadata;

-- 6. クスリのアオキ関連のデータ確認
SELECT 
  m.company_id,
  m.company_name,
  m.fiscal_year,
  COUNT(*) as file_count
FROM markdown_files_metadata m
WHERE m.company_name ILIKE '%クスリ%'
GROUP BY m.company_id, m.company_name, m.fiscal_year
ORDER BY m.fiscal_year DESC;

-- 7. サンプルデータ確認（更新されたレコード）
SELECT 
  company_id,
  company_name,
  fiscal_year,
  file_name
FROM markdown_files_metadata
WHERE company_name IS NOT NULL
LIMIT 10;