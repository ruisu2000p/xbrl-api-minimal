-- ステップ2: ビューの作成
-- step1実行後にこのSQLを実行してください

-- 1. 財務サマリービュー（主要指標のみ）
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

-- 2. データ品質チェックビュー
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

-- 3. ストレージパス管理ビュー
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

-- 4. 利用可能な年度リスト
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

-- ビューが作成されたか確認
SELECT 'All views created successfully' as status;