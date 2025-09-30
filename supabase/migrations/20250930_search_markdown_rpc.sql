-- RPC関数を作成してprivateスキーマにアクセス
CREATE OR REPLACE FUNCTION public.search_markdown_files(
  search_query TEXT DEFAULT '',
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  company_id TEXT,
  company_name TEXT,
  english_name TEXT,
  fiscal_year TEXT,
  file_type TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.company_id,
    m.company_name,
    m.english_name,
    m.fiscal_year,
    m.file_type,
    m.storage_path,
    m.created_at,
    m.updated_at
  FROM private.markdown_files_metadata m
  WHERE
    search_query = '' OR
    m.company_name ILIKE '%' || search_query || '%' OR
    m.english_name ILIKE '%' || search_query || '%'
  ORDER BY m.company_name, m.fiscal_year DESC
  LIMIT limit_count;
END;
$$;

-- 関数の権限設定
GRANT EXECUTE ON FUNCTION public.search_markdown_files TO anon, authenticated, service_role;

-- コメント追加
COMMENT ON FUNCTION public.search_markdown_files IS 'Search markdown files from private schema with API key authentication';