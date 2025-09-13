-- ===========================================
-- Markdown Files テーブル作成
-- Supabase Storageのmarkdown-filesをテーブル化
-- ===========================================

-- 1. financial_documents テーブル作成
-- ===========================================

CREATE TABLE IF NOT EXISTS financial_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  company_name TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_type TEXT, -- 'header', 'honbun', etc.
  file_order INTEGER, -- ファイルの順序番号
  doc_category TEXT CHECK (doc_category IN ('PublicDoc', 'AuditDoc')),
  fiscal_year INTEGER,
  fiscal_period TEXT,
  file_size BIGINT,
  content_preview TEXT, -- 最初の1000文字
  full_content TEXT, -- 全文（大容量）
  metadata JSONB, -- ファイルメタデータ
  storage_path TEXT NOT NULL, -- Storage上のパス
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- インデックス用制約
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 2. インデックス作成
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_financial_documents_company_id ON financial_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_file_type ON financial_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_financial_documents_doc_category ON financial_documents(doc_category);
CREATE INDEX IF NOT EXISTS idx_financial_documents_fiscal_year ON financial_documents(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_financial_documents_file_order ON financial_documents(file_order);
CREATE INDEX IF NOT EXISTS idx_financial_documents_storage_path ON financial_documents(storage_path);

-- フルテキスト検索用インデックス
CREATE INDEX IF NOT EXISTS idx_financial_documents_content_search 
  ON financial_documents USING gin(to_tsvector('japanese', content_preview));

-- 3. RLS設定
-- ===========================================

ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

-- パブリック読み取りポリシー
DROP POLICY IF EXISTS "Allow public read access on financial_documents" ON financial_documents;
CREATE POLICY "Allow public read access on financial_documents" ON financial_documents
  FOR SELECT USING (true);

-- 4. ファイル処理用の関数
-- ===========================================

-- ファイルパスから情報を抽出する関数
CREATE OR REPLACE FUNCTION extract_file_info(file_path TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  path_parts TEXT[];
  file_name TEXT;
  company_id TEXT;
  doc_category TEXT;
BEGIN
  -- パスを分割
  path_parts := string_to_array(file_path, '/');
  
  -- ファイル名を取得
  file_name := path_parts[array_length(path_parts, 1)];
  
  -- 企業IDを取得（最初のディレクトリ）
  IF array_length(path_parts, 1) >= 2 THEN
    company_id := path_parts[1];
  END IF;
  
  -- ドキュメントカテゴリを取得
  FOR i IN 1..array_length(path_parts, 1) LOOP
    IF path_parts[i] ~ '(PublicDoc|AuditDoc)' THEN
      doc_category := path_parts[i];
      EXIT;
    END IF;
  END LOOP;
  
  -- 結果をJSONBで返す
  result := jsonb_build_object(
    'file_name', file_name,
    'company_id', company_id,
    'doc_category', doc_category
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ファイルタイプを抽出する関数
CREATE OR REPLACE FUNCTION extract_file_type(file_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- ファイル名からタイプを抽出
  CASE 
    WHEN file_name ~ '^0000000_header' THEN RETURN 'header';
    WHEN file_name ~ '^0101010_honbun' THEN RETURN 'company_overview';
    WHEN file_name ~ '^0102010_honbun' THEN RETURN 'business_overview';
    WHEN file_name ~ '^0103010_honbun' THEN RETURN 'business_risks';
    WHEN file_name ~ '^0104010_honbun' THEN RETURN 'management_analysis';
    WHEN file_name ~ '^0105000_honbun' THEN RETURN 'financial_statements';
    WHEN file_name ~ '_honbun_' THEN RETURN 'main_content';
    WHEN file_name ~ '_header_' THEN RETURN 'header';
    ELSE RETURN 'other';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ファイル順序を抽出する関数
CREATE OR REPLACE FUNCTION extract_file_order(file_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  order_part TEXT;
BEGIN
  -- ファイル名から順序番号を抽出
  order_part := substring(file_name from '^([0-9]+)');
  
  IF order_part IS NOT NULL THEN
    RETURN order_part::INTEGER;
  ELSE
    RETURN 9999; -- デフォルト値
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. サンプルデータ投入用のテンプレート
-- ===========================================

-- 使用例（実際のデータは別のスクリプトで投入）
/*
INSERT INTO financial_documents (
  company_id,
  company_name,
  file_name,
  file_path,
  file_type,
  file_order,
  doc_category,
  fiscal_year,
  storage_path,
  content_preview,
  metadata
) VALUES (
  'S100L3K4',
  '株式会社タカショー',
  '0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
  'S100L3K4/PublicDoc_markdown/0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
  'company_overview',
  0101010,
  'PublicDoc',
  2021,
  'markdown-files/S100L3K4/PublicDoc_markdown/0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
  '# 企業概況\n\n当社は...',
  '{"file_extension": "md", "created_date": "2021-01-20"}'
);
*/

-- 6. 統計・確認用クエリ
-- ===========================================

-- テーブル作成確認
SELECT 
  'financial_documents table created' as status,
  COUNT(*) as record_count
FROM financial_documents;

-- 関数の動作確認
SELECT 
  extract_file_info('S100L3K4/PublicDoc_markdown/0101010_honbun_test.md') as file_info,
  extract_file_type('0101010_honbun_test.md') as file_type,
  extract_file_order('0101010_honbun_test.md') as file_order;

SELECT '✅ Markdown Files テーブルセットアップ完了' as message;