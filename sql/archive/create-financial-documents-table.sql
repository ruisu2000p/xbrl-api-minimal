-- financial_documentsテーブルを作成
-- 個別のMarkdownファイルを保存するためのテーブル

-- UUID拡張を有効化（まだの場合）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- テーブルを作成
CREATE TABLE IF NOT EXISTS financial_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id VARCHAR(50) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  doc_category VARCHAR(20) NOT NULL CHECK (doc_category IN ('public', 'audit')),
  file_name VARCHAR(255) NOT NULL,
  file_order VARCHAR(20),
  file_type VARCHAR(50),
  storage_path TEXT NOT NULL,
  content_preview TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 外部キー制約
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  
  -- ユニーク制約
  UNIQUE(company_id, fiscal_year, doc_category, file_name)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_financial_documents_company ON financial_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_year ON financial_documents(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_financial_documents_category ON financial_documents(doc_category);
CREATE INDEX IF NOT EXISTS idx_financial_documents_type ON financial_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_financial_documents_company_year ON financial_documents(company_id, fiscal_year);

-- RLSポリシーを追加（公開読み取り）
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON financial_documents
  FOR SELECT USING (true);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_documents_updated_at
  BEFORE UPDATE ON financial_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- テーブル作成完了メッセージ
SELECT 'financial_documentsテーブルを作成しました' AS message;