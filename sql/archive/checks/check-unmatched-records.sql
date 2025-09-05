-- 照合できなかったレコードを調査するSQL

-- ============================================
-- 1. 照合できなかったレコードの概要
-- ============================================
SELECT 
  'markdown_files_metadata内の未照合' as category,
  COUNT(*) as count
FROM markdown_files_metadata m
WHERE NOT EXISTS (
  SELECT 1 FROM companies c WHERE c.id = m.company_id
);

-- ============================================
-- 2. 照合できなかったcompany_idのリスト（上位50件）
-- ============================================
SELECT DISTINCT
  m.company_id,
  m.company_name,
  m.fiscal_year,
  COUNT(*) as file_count
FROM markdown_files_metadata m
WHERE NOT EXISTS (
  SELECT 1 FROM companies c WHERE c.id = m.company_id
)
GROUP BY m.company_id, m.company_name, m.fiscal_year
ORDER BY m.company_id
LIMIT 50;

-- ============================================
-- 3. 年度別の未照合レコード数
-- ============================================
SELECT 
  m.fiscal_year,
  COUNT(DISTINCT m.company_id) as unmatched_companies,
  COUNT(*) as total_files
FROM markdown_files_metadata m
WHERE NOT EXISTS (
  SELECT 1 FROM companies c WHERE c.id = m.company_id
)
GROUP BY m.fiscal_year
ORDER BY m.fiscal_year;

-- ============================================
-- 4. companiesテーブルに存在するがmetadataに無いID
-- ============================================
SELECT 
  c.id,
  c.name,
  c.description
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM markdown_files_metadata m WHERE m.company_id = c.id
)
LIMIT 50;

-- ============================================
-- 5. company_idの形式パターン分析
-- ============================================
-- markdown_files_metadataのIDパターン
SELECT 
  'markdown_files_metadata' as table_name,
  CASE 
    WHEN company_id LIKE 'S100%' THEN 'S100形式'
    WHEN company_id LIKE 'S10%' THEN 'S10形式（その他）'
    WHEN company_id ~ '^[0-9]{4}$' THEN '4桁数字'
    WHEN company_id ~ '^[0-9]+$' THEN '数字のみ'
    WHEN company_id ~ '^[A-Z]' THEN '英字開始'
    ELSE 'その他'
  END as id_pattern,
  COUNT(DISTINCT company_id) as count
FROM markdown_files_metadata
GROUP BY id_pattern

UNION ALL

-- companiesテーブルのIDパターン
SELECT 
  'companies' as table_name,
  CASE 
    WHEN id LIKE 'S100%' THEN 'S100形式'
    WHEN id LIKE 'S10%' THEN 'S10形式（その他）'
    WHEN id ~ '^[0-9]{4}$' THEN '4桁数字'
    WHEN id ~ '^[0-9]+$' THEN '数字のみ'
    WHEN id ~ '^[A-Z]' THEN '英字開始'
    ELSE 'その他'
  END as id_pattern,
  COUNT(*) as count
FROM companies
GROUP BY id_pattern
ORDER BY table_name, id_pattern;

-- ============================================
-- 6. company_nameが空でcompany_idが未照合のレコード
-- ============================================
SELECT 
  COUNT(*) as empty_name_unmatched_count
FROM markdown_files_metadata m
WHERE (m.company_name IS NULL OR m.company_name = '')
AND NOT EXISTS (
  SELECT 1 FROM companies c WHERE c.id = m.company_id
);

-- ============================================
-- 7. 部分一致で照合可能なレコードを探す
-- ============================================
-- company_idの先頭部分で照合を試みる
SELECT 
  m.company_id as metadata_id,
  c.id as companies_id,
  c.name as company_name,
  m.fiscal_year
FROM markdown_files_metadata m
JOIN companies c ON SUBSTRING(m.company_id, 1, 8) = SUBSTRING(c.id, 1, 8)
WHERE NOT EXISTS (
  SELECT 1 FROM companies c2 WHERE c2.id = m.company_id
)
LIMIT 20;

-- ============================================
-- 8. 照合統計サマリー
-- ============================================
WITH match_stats AS (
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM companies c WHERE c.id = m.company_id) 
      THEN '照合成功'
      ELSE '照合失敗'
    END as match_status,
    COUNT(*) as record_count,
    COUNT(DISTINCT m.company_id) as unique_company_count
  FROM markdown_files_metadata m
  GROUP BY match_status
)
SELECT 
  match_status,
  record_count,
  unique_company_count,
  ROUND(100.0 * record_count / SUM(record_count) OVER (), 2) as percentage
FROM match_stats
ORDER BY match_status;

-- ============================================
-- 9. 特定の未照合company_idの詳細（例：最初の5つ）
-- ============================================
WITH unmatched_ids AS (
  SELECT DISTINCT company_id
  FROM markdown_files_metadata m
  WHERE NOT EXISTS (
    SELECT 1 FROM companies c WHERE c.id = m.company_id
  )
  LIMIT 5
)
SELECT 
  m.company_id,
  m.company_name,
  m.fiscal_year,
  m.file_name,
  m.storage_path
FROM markdown_files_metadata m
WHERE m.company_id IN (SELECT company_id FROM unmatched_ids)
ORDER BY m.company_id, m.fiscal_year, m.file_name;

-- ============================================
-- 10. 照合改善案：類似IDを探す
-- ============================================
-- EDINETコードの変換パターンを探る
SELECT 
  m.company_id as unmatched_id,
  c.id as potential_match,
  c.name,
  SIMILARITY(m.company_id, c.id) as similarity_score
FROM (
  SELECT DISTINCT company_id 
  FROM markdown_files_metadata 
  WHERE NOT EXISTS (
    SELECT 1 FROM companies c WHERE c.id = company_id
  )
  LIMIT 10
) m
CROSS JOIN LATERAL (
  SELECT id, name
  FROM companies c
  ORDER BY SIMILARITY(c.id, m.company_id) DESC
  LIMIT 3
) c
ORDER BY m.company_id, similarity_score DESC;