-- ============================================
-- Remaining Tables Setup (Fixed Version)
-- ============================================
-- companiesテーブルとmarkdown_files_metadataテーブルを作成
-- ============================================

-- 1. companiesテーブル作成（既存の場合はスキップ）
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    ticker_code TEXT,
    company_name TEXT NOT NULL,
    directory_name TEXT,
    sector TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker_code);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

-- 2. markdown_files_metadataテーブル作成
CREATE TABLE IF NOT EXISTS markdown_files_metadata (
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
    doc_category TEXT CHECK (doc_category IN ('public', 'audit')),
    sector TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_markdown_company ON markdown_files_metadata(company_id);
CREATE INDEX IF NOT EXISTS idx_markdown_fiscal ON markdown_files_metadata(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_markdown_category ON markdown_files_metadata(doc_category);
CREATE INDEX IF NOT EXISTS idx_markdown_company_name ON markdown_files_metadata(company_name);
CREATE INDEX IF NOT EXISTS idx_markdown_ticker ON markdown_files_metadata(ticker_code);
CREATE INDEX IF NOT EXISTS idx_markdown_sector ON markdown_files_metadata(sector);

-- 3. RLS有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE markdown_files_metadata ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー作成（既存のポリシーを削除してから作成）
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

-- 5. トリガー関数（既に存在する場合はスキップ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 更新トリガー適用
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_markdown_metadata_updated_at ON markdown_files_metadata;
CREATE TRIGGER update_markdown_metadata_updated_at BEFORE UPDATE ON markdown_files_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. サンプルデータ挿入（テスト用）
INSERT INTO companies (id, ticker_code, company_name, directory_name, sector)
VALUES 
    ('S100L3K4', '7590', '株式会社タカショー', 'S100L3K4_株式会社タカショー', '卸売業'),
    ('S100DEMO', '0000', 'デモ株式会社', 'S100DEMO_デモ株式会社', 'サービス業')
ON CONFLICT (id) DO NOTHING;

INSERT INTO markdown_files_metadata (
    company_id, company_name, ticker_code, fiscal_year, 
    file_name, file_type, doc_category, sector
)
VALUES 
    ('S100L3K4', '株式会社タカショー', '7590', '2021', 
     'sample_document.md', 'markdown', 'public', '卸売業'),
    ('S100DEMO', 'デモ株式会社', '0000', '2021', 
     'demo_document.md', 'markdown', 'public', 'サービス業')
ON CONFLICT DO NOTHING;

-- 8. ビュー作成（便利な集計用）
DROP VIEW IF EXISTS company_documents_summary;
CREATE VIEW company_documents_summary AS
SELECT 
    c.id,
    c.company_name,
    c.ticker_code,
    c.sector,
    mfm.fiscal_year,
    COUNT(mfm.id) as total_files,
    SUM(mfm.file_size) as total_size,
    MIN(mfm.created_at) as first_upload,
    MAX(mfm.created_at) as last_upload
FROM companies c
LEFT JOIN markdown_files_metadata mfm ON c.id = mfm.company_id
GROUP BY c.id, c.company_name, c.ticker_code, c.sector, mfm.fiscal_year;

-- 9. API使用統計ビュー
DROP VIEW IF EXISTS api_key_usage_summary;
CREATE VIEW api_key_usage_summary AS
SELECT 
    ak.id,
    ak.name,
    ak.tier,
    ak.status,
    ak.total_requests,
    ak.successful_requests,
    ak.failed_requests,
    arl.requests_per_hour,
    arl.requests_per_day,
    arl.requests_per_month,
    arl.current_hour_count,
    arl.current_day_count,
    arl.current_month_count
FROM api_keys ak
LEFT JOIN api_key_rate_limits arl ON ak.id = arl.api_key_id;

-- 10. 確認クエリ
SELECT 
    'Tables created successfully!' as message,
    (SELECT COUNT(*) FROM companies) as companies_count,
    (SELECT COUNT(*) FROM markdown_files_metadata) as documents_count,
    (SELECT COUNT(*) FROM api_keys) as api_keys_count;