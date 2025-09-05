-- =====================================================
-- XBRL データ管理用のビューとテーブル作成
-- =====================================================

-- 1. Storage内のデータを管理するメタデータテーブル
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

-- 2. 企業マスタービュー（companiesテーブルとstorage_metadataを結合）
CREATE OR REPLACE VIEW public.company_data_overview AS
SELECT 
    c.id AS company_id,
    c.name AS company_name,
    c.ticker,
    c.sector,
    c.market,
    -- FY2021データの存在確認
    CASE WHEN sm2021.company_id IS NOT NULL THEN true ELSE false END AS has_fy2021,
    sm2021.file_count AS fy2021_files,
    sm2021.revenue AS fy2021_revenue,
    sm2021.net_income AS fy2021_net_income,
    -- FY2016データの存在確認
    CASE WHEN sm2016.company_id IS NOT NULL THEN true ELSE false END AS has_fy2016,
    sm2016.file_count AS fy2016_files,
    sm2016.revenue AS fy2016_revenue,
    sm2016.net_income AS fy2016_net_income,
    -- 成長率計算（FY2016からFY2021）
    CASE 
        WHEN sm2016.revenue > 0 AND sm2021.revenue > 0 
        THEN ROUND(((sm2021.revenue - sm2016.revenue) / sm2016.revenue * 100)::numeric, 2)
        ELSE NULL 
    END AS revenue_growth_rate,
    c.created_at,
    c.updated_at
FROM 
    public.companies c
LEFT JOIN 
    public.storage_metadata sm2021 ON c.id = sm2021.company_id AND sm2021.fiscal_year = 'FY2021'
LEFT JOIN 
    public.storage_metadata sm2016 ON c.id = sm2016.company_id AND sm2016.fiscal_year = 'FY2016'
ORDER BY 
    c.name;

-- 3. 利用可能な年度リスト
CREATE OR REPLACE VIEW public.available_fiscal_years AS
SELECT DISTINCT 
    fiscal_year,
    COUNT(DISTINCT company_id) AS company_count,
    MIN(data_date) AS earliest_date,
    MAX(data_date) AS latest_date
FROM 
    public.storage_metadata
GROUP BY 
    fiscal_year
ORDER BY 
    fiscal_year;

-- 4. データ品質チェックビュー
CREATE OR REPLACE VIEW public.data_quality_check AS
SELECT 
    company_id,
    company_name,
    fiscal_year,
    file_path,
    CASE 
        WHEN file_count = 0 THEN 'No files'
        WHEN file_count < 5 THEN 'Incomplete'
        WHEN file_count >= 5 AND file_count < 10 THEN 'Partial'
        ELSE 'Complete'
    END AS data_status,
    CASE 
        WHEN revenue IS NOT NULL AND net_income IS NOT NULL THEN 'Available'
        ELSE 'Missing'
    END AS financial_metrics_status,
    file_count,
    updated_at
FROM 
    public.storage_metadata
ORDER BY 
    updated_at DESC;

-- 5. 財務サマリービュー（主要指標のみ）
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT 
    sm.company_id,
    sm.company_name,
    sm.fiscal_year,
    sm.revenue,
    sm.operating_income,
    sm.net_income,
    sm.total_assets,
    sm.net_assets,
    -- 利益率計算
    CASE 
        WHEN sm.revenue > 0 
        THEN ROUND((sm.operating_income / sm.revenue * 100)::numeric, 2)
        ELSE NULL 
    END AS operating_margin,
    CASE 
        WHEN sm.revenue > 0 
        THEN ROUND((sm.net_income / sm.revenue * 100)::numeric, 2)
        ELSE NULL 
    END AS net_margin,
    -- ROA計算
    CASE 
        WHEN sm.total_assets > 0 
        THEN ROUND((sm.net_income / sm.total_assets * 100)::numeric, 2)
        ELSE NULL 
    END AS roa,
    -- ROE計算
    CASE 
        WHEN sm.net_assets > 0 
        THEN ROUND((sm.net_income / sm.net_assets * 100)::numeric, 2)
        ELSE NULL 
    END AS roe,
    sm.data_date
FROM 
    public.storage_metadata sm
WHERE 
    sm.has_financial_data = true
ORDER BY 
    sm.fiscal_year DESC, sm.revenue DESC NULLS LAST;

-- 6. ストレージパス管理ビュー
CREATE OR REPLACE VIEW public.storage_paths AS
SELECT 
    company_id,
    company_name,
    fiscal_year,
    CASE 
        WHEN fiscal_year = 'FY2016' THEN 'FY2016/' || company_id || '/PublicDoc/'
        WHEN fiscal_year = 'FY2021' THEN company_id || '/PublicDoc_markdown/'
        ELSE fiscal_year || '/' || company_id || '/'
    END AS storage_path,
    file_count,
    updated_at
FROM 
    public.storage_metadata
ORDER BY 
    fiscal_year, company_name;

-- 7. データ更新用の関数
CREATE OR REPLACE FUNCTION public.update_storage_metadata(
    p_company_id VARCHAR(50),
    p_company_name TEXT,
    p_fiscal_year VARCHAR(10),
    p_file_path TEXT,
    p_file_count INTEGER DEFAULT 0,
    p_revenue NUMERIC DEFAULT NULL,
    p_operating_income NUMERIC DEFAULT NULL,
    p_net_income NUMERIC DEFAULT NULL,
    p_total_assets NUMERIC DEFAULT NULL,
    p_net_assets NUMERIC DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.storage_metadata (
        company_id,
        company_name,
        fiscal_year,
        file_path,
        file_count,
        has_financial_data,
        revenue,
        operating_income,
        net_income,
        total_assets,
        net_assets,
        updated_at
    ) VALUES (
        p_company_id,
        p_company_name,
        p_fiscal_year,
        p_file_path,
        p_file_count,
        (p_revenue IS NOT NULL OR p_net_income IS NOT NULL),
        p_revenue,
        p_operating_income,
        p_net_income,
        p_total_assets,
        p_net_assets,
        NOW()
    )
    ON CONFLICT (company_id, fiscal_year) 
    DO UPDATE SET
        company_name = EXCLUDED.company_name,
        file_path = EXCLUDED.file_path,
        file_count = EXCLUDED.file_count,
        has_financial_data = EXCLUDED.has_financial_data,
        revenue = EXCLUDED.revenue,
        operating_income = EXCLUDED.operating_income,
        net_income = EXCLUDED.net_income,
        total_assets = EXCLUDED.total_assets,
        net_assets = EXCLUDED.net_assets,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. 統計情報ビュー
CREATE OR REPLACE VIEW public.data_statistics AS
SELECT 
    'Total Companies' AS metric,
    COUNT(DISTINCT company_id)::TEXT AS value
FROM public.companies
UNION ALL
SELECT 
    'Companies with FY2021 Data' AS metric,
    COUNT(DISTINCT company_id)::TEXT AS value
FROM public.storage_metadata
WHERE fiscal_year = 'FY2021'
UNION ALL
SELECT 
    'Companies with FY2016 Data' AS metric,
    COUNT(DISTINCT company_id)::TEXT AS value
FROM public.storage_metadata
WHERE fiscal_year = 'FY2016'
UNION ALL
SELECT 
    'Total Storage Records' AS metric,
    COUNT(*)::TEXT AS value
FROM public.storage_metadata
UNION ALL
SELECT 
    'Records with Financial Data' AS metric,
    COUNT(*)::TEXT AS value
FROM public.storage_metadata
WHERE has_financial_data = true;

-- 9. 検索用の全文検索インデックス
CREATE INDEX IF NOT EXISTS idx_companies_name_gin ON public.companies USING gin(to_tsvector('japanese', name));

-- 10. パフォーマンス最適化のための統計情報更新
ANALYZE public.companies;
ANALYZE public.storage_metadata;

-- =====================================================
-- 初期データの挿入例（亀田製菓）
-- =====================================================
SELECT public.update_storage_metadata(
    'S100LJ4F',
    '亀田製菓株式会社',
    'FY2021',
    'S100LJ4F/PublicDoc_markdown/',
    10,
    103305,  -- 売上高（百万円）
    NULL,    -- 営業利益
    4757,    -- 当期純利益
    92888,   -- 総資産
    59895    -- 純資産
);

-- =====================================================
-- 管理者向けクエリ例
-- =====================================================

-- 例1: 全企業のデータ状況確認
-- SELECT * FROM public.company_data_overview WHERE has_fy2021 = true OR has_fy2016 = true;

-- 例2: 財務データが完全な企業リスト
-- SELECT * FROM public.financial_summary WHERE fiscal_year = 'FY2021' ORDER BY revenue DESC LIMIT 100;

-- 例3: データ品質の確認
-- SELECT * FROM public.data_quality_check WHERE data_status != 'Complete';

-- 例4: 成長率ランキング
-- SELECT company_name, revenue_growth_rate FROM public.company_data_overview 
-- WHERE revenue_growth_rate IS NOT NULL ORDER BY revenue_growth_rate DESC LIMIT 50;