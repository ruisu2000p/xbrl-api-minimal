-- ===========================================
-- Markdown Files メタデータテーブル作成
-- Supabase Storage連携用
-- ===========================================

-- 1. markdown_files_metadata テーブル作成
-- ===========================================

CREATE TABLE IF NOT EXISTS markdown_files_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 企業情報
  company_id TEXT NOT NULL,
  company_name TEXT,
  
  -- ファイル情報
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  
  -- 分類情報
  fiscal_year INTEGER,
  document_type TEXT, -- 'PublicDoc', 'AuditDoc'
  section_type TEXT, -- 'header', 'honbun', 'cover' etc.
  file_order INTEGER DEFAULT 0,
  
  -- ファイルメタデータ
  file_size BIGINT,
  file_extension TEXT DEFAULT 'md',
  
  -- 内容情報
  content_preview TEXT, -- 最初の500文字
  has_tables BOOLEAN DEFAULT FALSE,
  has_images BOOLEAN DEFAULT FALSE,
  
  -- システム情報
  storage_bucket TEXT DEFAULT 'markdown-files',
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. インデックス作成
-- ===========================================

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_markdown_company_id ON markdown_files_metadata(company_id);
CREATE INDEX IF NOT EXISTS idx_markdown_company_name ON markdown_files_metadata(company_name);
CREATE INDEX IF NOT EXISTS idx_markdown_fiscal_year ON markdown_files_metadata(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_markdown_document_type ON markdown_files_metadata(document_type);
CREATE INDEX IF NOT EXISTS idx_markdown_section_type ON markdown_files_metadata(section_type);

-- 複合インデックス
CREATE INDEX IF NOT EXISTS idx_markdown_company_year ON markdown_files_metadata(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_markdown_company_section ON markdown_files_metadata(company_id, section_type);

-- ファイルパス検索用
CREATE INDEX IF NOT EXISTS idx_markdown_storage_path ON markdown_files_metadata(storage_path);
CREATE INDEX IF NOT EXISTS idx_markdown_file_path ON markdown_files_metadata(file_path);

-- フルテキスト検索用インデックス
CREATE INDEX IF NOT EXISTS idx_markdown_content_search 
  ON markdown_files_metadata USING gin(to_tsvector('japanese', content_preview));

-- 3. RLS設定
-- ===========================================

ALTER TABLE markdown_files_metadata ENABLE ROW LEVEL SECURITY;

-- パブリック読み取りポリシー
DROP POLICY IF EXISTS "Allow public read access on markdown_files_metadata" ON markdown_files_metadata;
CREATE POLICY "Allow public read access on markdown_files_metadata" ON markdown_files_metadata
  FOR SELECT USING (true);

-- サービスロール書き込みポリシー  
DROP POLICY IF EXISTS "Allow service role write access on markdown_files_metadata" ON markdown_files_metadata;
CREATE POLICY "Allow service role write access on markdown_files_metadata" ON markdown_files_metadata
  FOR ALL USING (auth.role() = 'service_role');

-- 4. ファイルパス解析用の関数
-- ===========================================

-- ファイルパスから情報を抽出する関数
CREATE OR REPLACE FUNCTION parse_markdown_file_path(file_path TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  path_parts TEXT[];
  file_name TEXT;
  company_id TEXT;
  document_type TEXT := 'unknown';
  section_type TEXT := 'unknown';
  fiscal_year INTEGER;
BEGIN
  -- パスを分割
  path_parts := string_to_array(file_path, '/');
  
  -- ファイル名を取得
  file_name := path_parts[array_length(path_parts, 1)];
  
  -- 企業IDを抽出（通常は最初のディレクトリ）
  IF array_length(path_parts, 1) >= 2 THEN
    company_id := path_parts[1];
  END IF;
  
  -- ドキュメントタイプを抽出
  FOR i IN 1..array_length(path_parts, 1) LOOP
    IF path_parts[i] ~ '(PublicDoc|AuditDoc)' THEN
      IF path_parts[i] LIKE '%PublicDoc%' THEN
        document_type := 'PublicDoc';
      ELSIF path_parts[i] LIKE '%AuditDoc%' THEN
        document_type := 'AuditDoc';  
      END IF;
      EXIT;
    END IF;
  END LOOP;
  
  -- セクションタイプを抽出
  CASE 
    WHEN file_name ~ '^0000000_header' THEN section_type := 'header';
    WHEN file_name ~ '^0101010_honbun' THEN section_type := 'company_overview';
    WHEN file_name ~ '^0102010_honbun' THEN section_type := 'business_overview';
    WHEN file_name ~ '^0103010_honbun' THEN section_type := 'business_risks';
    WHEN file_name ~ '^0104010_honbun' THEN section_type := 'management_analysis';
    WHEN file_name ~ '^0105000_honbun' THEN section_type := 'financial_statements';
    WHEN file_name ~ '_honbun_' THEN section_type := 'main_content';
    WHEN file_name ~ '_cover_' THEN section_type := 'cover';
    ELSE section_type := 'other';
  END CASE;
  
  -- 年度を抽出（ファイル名から）
  IF file_name ~ '202[0-9]' THEN
    SELECT substring(file_name from '(202[0-9])')::INTEGER INTO fiscal_year;
  END IF;
  
  -- 結果をJSONBで返す
  result := jsonb_build_object(
    'company_id', company_id,
    'document_type', document_type,
    'section_type', section_type,
    'fiscal_year', fiscal_year,
    'file_name', file_name
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. ファイル順序を抽出する関数
-- ===========================================

CREATE OR REPLACE FUNCTION extract_file_order(file_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  order_part TEXT;
BEGIN
  -- ファイル名から順序番号を抽出
  order_part := substring(file_name from '^([0-9]+)');
  
  IF order_part IS NOT NULL AND order_part != '' THEN
    RETURN order_part::INTEGER;
  ELSE
    RETURN 9999; -- デフォルト値
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 9999;
END;
$$ LANGUAGE plpgsql;

-- 6. 便利なビューの作成
-- ===========================================

-- 企業別ファイル数統計
CREATE OR REPLACE VIEW markdown_files_summary AS
SELECT 
  company_id,
  company_name,
  fiscal_year,
  document_type,
  COUNT(*) as file_count,
  MIN(file_order) as first_file_order,
  MAX(file_order) as last_file_order,
  SUM(file_size) as total_size,
  COUNT(*) FILTER (WHERE has_tables) as files_with_tables,
  COUNT(*) FILTER (WHERE has_images) as files_with_images,
  MAX(indexed_at) as last_indexed
FROM markdown_files_metadata 
GROUP BY company_id, company_name, fiscal_year, document_type
ORDER BY company_id, fiscal_year, document_type;

-- 検索用ビュー
CREATE OR REPLACE VIEW searchable_markdown_files AS
SELECT 
  id,
  company_id,
  company_name,
  fiscal_year,
  document_type,
  section_type,
  file_name,
  storage_path,
  content_preview,
  file_size,
  created_at,
  -- 検索用の結合フィールド
  company_id || ' ' || COALESCE(company_name, '') as company_search,
  COALESCE(content_preview, '') as searchable_content
FROM markdown_files_metadata;

-- 7. 統計・確認用クエリ
-- ===========================================

-- テーブル作成確認
SELECT 
  'markdown_files_metadata table created' as status,
  COUNT(*) as record_count
FROM markdown_files_metadata;

-- 関数の動作確認
SELECT 
  parse_markdown_file_path('S100L3K4/PublicDoc_markdown/0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md') as parsed_info,
  extract_file_order('0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md') as file_order;

SELECT '✅ Markdown Files メタデータテーブルセットアップ完了' as message;