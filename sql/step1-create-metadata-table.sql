-- ステップ1: メタデータテーブルの作成
-- このSQLをSupabase SQL Editorで実行してください

-- 既存のテーブルがある場合は削除（注意：データが失われます）
-- DROP TABLE IF EXISTS public.storage_metadata CASCADE;

-- Storage内のデータを管理するメタデータテーブル
CREATE TABLE IF NOT EXISTS public.storage_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id VARCHAR(50) NOT NULL,
    company_name TEXT,
    fiscal_year VARCHAR(10) NOT NULL,
    file_path TEXT NOT NULL,
    file_count INTEGER DEFAULT 0,
    has_financial_data BOOLEAN DEFAULT false,
    revenue NUMERIC,
    operating_income NUMERIC,
    net_income NUMERIC,
    total_assets NUMERIC,
    net_assets NUMERIC,
    data_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, fiscal_year)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_storage_metadata_company_id ON public.storage_metadata(company_id);
CREATE INDEX IF NOT EXISTS idx_storage_metadata_fiscal_year ON public.storage_metadata(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_storage_metadata_company_name ON public.storage_metadata(company_name);

-- テーブルが作成されたか確認
SELECT 'storage_metadata table created successfully' as status;