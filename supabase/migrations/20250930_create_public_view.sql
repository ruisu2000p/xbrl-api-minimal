-- publicスキーマにビューを作成（privateテーブルを参照）
CREATE OR REPLACE VIEW public.markdown_files_metadata AS
SELECT
  id,
  company_id,
  company_name,
  english_name,
  fiscal_year,
  file_type,
  storage_path,
  file_name,
  created_at,
  updated_at
FROM private.markdown_files_metadata;

-- ビューの権限設定
GRANT SELECT ON public.markdown_files_metadata TO anon, authenticated, service_role;

-- コメント追加
COMMENT ON VIEW public.markdown_files_metadata IS 'Public view of private markdown_files_metadata table for API access';