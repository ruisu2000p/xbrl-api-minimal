-- ============================================
-- Simple Tables Setup (最小構成版)
-- ============================================
-- エラーを避けるため、シンプルな構造で作成
-- ============================================

-- 1. 既存テーブルを削除（クリーンスタート）
DROP TABLE IF EXISTS markdown_files_metadata CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 2. companiesテーブル作成
CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    ticker_code TEXT,
    company_name TEXT NOT NULL,
    directory_name TEXT,
    sector TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_companies_ticker ON companies(ticker_code);
CREATE INDEX idx_companies_name ON companies(company_name);
CREATE INDEX idx_companies_sector ON companies(sector);

-- 3. markdown_files_metadataテーブル作成（シンプル版）
CREATE TABLE markdown_files_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT REFERENCES companies(id),
    company_name TEXT,
    ticker_code TEXT,
    fiscal_year TEXT,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    storage_bucket TEXT DEFAULT 'markdown-files',
    storage_path TEXT,
    sector TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_markdown_company ON markdown_files_metadata(company_id);
CREATE INDEX idx_markdown_fiscal ON markdown_files_metadata(fiscal_year);
CREATE INDEX idx_markdown_company_name ON markdown_files_metadata(company_name);
CREATE INDEX idx_markdown_ticker ON markdown_files_metadata(ticker_code);
CREATE INDEX idx_markdown_sector ON markdown_files_metadata(sector);

-- 4. RLS有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE markdown_files_metadata ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシー作成
-- Companies: 全員読み取り可能
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
CREATE POLICY "Enable read access for all users" ON companies
    FOR SELECT
    USING (true);

-- Markdown Files: 全員読み取り可能
DROP POLICY IF EXISTS "Enable read access for all users" ON markdown_files_metadata;
CREATE POLICY "Enable read access for all users" ON markdown_files_metadata
    FOR SELECT
    USING (true);

-- 6. トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 更新トリガー適用
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_markdown_metadata_updated_at ON markdown_files_metadata;
CREATE TRIGGER update_markdown_metadata_updated_at BEFORE UPDATE ON markdown_files_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. サンプルデータ挿入（テスト用）
INSERT INTO companies (id, ticker_code, company_name, directory_name, sector)
VALUES 
    ('S100L3K4', '7590', '株式会社タカショー', 'S100L3K4_株式会社タカショー', '卸売業'),
    ('S100DEMO', '0000', 'デモ株式会社', 'S100DEMO_デモ株式会社', 'サービス業'),
    ('S100TEST', '9999', 'テスト株式会社', 'S100TEST_テスト株式会社', '情報通信業');

INSERT INTO markdown_files_metadata (
    company_id, company_name, ticker_code, fiscal_year, 
    file_name, file_type, sector
)
VALUES 
    ('S100L3K4', '株式会社タカショー', '7590', '2021', 
     'sample_document.md', 'markdown', '卸売業'),
    ('S100L3K4', '株式会社タカショー', '7590', '2024', 
     'sample_document_2024.md', 'markdown', '卸売業'),
    ('S100DEMO', 'デモ株式会社', '0000', '2021', 
     'demo_document.md', 'markdown', 'サービス業'),
    ('S100DEMO', 'デモ株式会社', '0000', '2024', 
     'demo_document_2024.md', 'markdown', 'サービス業'),
    ('S100TEST', 'テスト株式会社', '9999', '2024', 
     'test_document.md', 'markdown', '情報通信業');

-- 9. ビュー作成
DROP VIEW IF EXISTS company_documents_summary CASCADE;
CREATE VIEW company_documents_summary AS
SELECT 
    c.id,
    c.company_name,
    c.ticker_code,
    c.sector,
    mfm.fiscal_year,
    COUNT(mfm.id) as total_files,
    MIN(mfm.created_at) as first_upload,
    MAX(mfm.created_at) as last_upload
FROM companies c
LEFT JOIN markdown_files_metadata mfm ON c.id = mfm.company_id
GROUP BY c.id, c.company_name, c.ticker_code, c.sector, mfm.fiscal_year;

-- 10. テーブル作成確認
SELECT 
    'Setup completed!' as status,
    (SELECT COUNT(*) FROM companies) as companies_count,
    (SELECT COUNT(*) FROM markdown_files_metadata) as documents_count,
    (SELECT COUNT(*) FROM api_keys) as api_keys_count,
    (SELECT COUNT(DISTINCT table_name) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_type = 'BASE TABLE') as total_tables;