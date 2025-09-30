-- ビューを削除して、明確にprivate.markdown_files_metadataを参照するように再作成
DROP VIEW IF EXISTS public.markdown_files_metadata CASCADE;

-- 明確にprivateスキーマを指定してビューを作成
CREATE VIEW public.markdown_files_metadata AS
SELECT
  id,
  company_id,
  company_name,
  fiscal_year,
  file_name,
  file_type,
  storage_path,
  created_at,
  updated_at,
  file_size,
  english_name
FROM private.markdown_files_metadata;  -- 明確にprivate.を指定

-- 権限設定
GRANT SELECT ON public.markdown_files_metadata TO anon, authenticated, service_role;

-- コメント追加
COMMENT ON VIEW public.markdown_files_metadata IS 'Public view of private.markdown_files_metadata table (SECURITY INVOKER)';

-- 確認クエリ
SELECT
    n.nspname AS view_schema,
    c.relname AS view_name,
    pg_get_viewdef(c.oid, true) AS view_definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname = 'markdown_files_metadata';

-- データ確認
SELECT COUNT(*) as total_count FROM public.markdown_files_metadata;

-- 検索テスト
SELECT company_name, english_name
FROM public.markdown_files_metadata
WHERE company_name ILIKE '%トヨタ%'
   OR english_name ILIKE '%toyota%'
LIMIT 5;