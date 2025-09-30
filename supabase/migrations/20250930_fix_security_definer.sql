-- 既存のビューを削除して、SECURITY DEFINERなしで再作成
DROP VIEW IF EXISTS public.markdown_files_metadata;

-- SECURITY INVOKERビューとして再作成（デフォルト）
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
FROM private.markdown_files_metadata;

-- 権限設定
GRANT SELECT ON public.markdown_files_metadata TO anon, authenticated, service_role;

-- コメント追加
COMMENT ON VIEW public.markdown_files_metadata IS 'Public view of private markdown files metadata (SECURITY INVOKER)';