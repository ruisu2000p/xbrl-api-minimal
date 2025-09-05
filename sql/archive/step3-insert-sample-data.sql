-- ステップ3: サンプルデータの挿入
-- step1, step2実行後にこのSQLを実行してください

-- 亀田製菓のデータを挿入
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
    net_assets
) VALUES 
-- FY2021データ
(
    'S100LJ4F',
    '亀田製菓株式会社',
    'FY2021',
    'S100LJ4F/PublicDoc_markdown/',
    10,
    true,
    103305,  -- 売上高（百万円）
    6889,    -- 営業利益
    4757,    -- 当期純利益
    92888,   -- 総資産
    59895    -- 純資産
),
-- FY2017データ（過去データの例）
(
    'S100LJ4F',
    '亀田製菓株式会社',
    'FY2017',
    'S100LJ4F/PublicDoc_markdown/',
    10,
    true,
    98206,   -- 売上高
    7122,    -- 営業利益
    2702,    -- 当期純利益
    72606,   -- 総資産
    44319    -- 純資産
)
ON CONFLICT (company_id, fiscal_year) DO UPDATE SET
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

-- 他のサンプル企業データ（FY2016の例）
INSERT INTO public.storage_metadata (
    company_id,
    company_name,
    fiscal_year,
    file_path,
    file_count,
    has_financial_data,
    revenue,
    net_income
) VALUES 
(
    'S10058MP',
    'サンプル企業A',
    'FY2016',
    'FY2016/S10058MP/PublicDoc/',
    15,
    true,
    50000,   -- 売上高
    3000     -- 当期純利益
),
(
    'S1005RT3',
    'サンプル企業B',
    'FY2016',
    'FY2016/S1005RT3/PublicDoc/',
    12,
    true,
    75000,   -- 売上高
    5000     -- 当期純利益
)
ON CONFLICT (company_id, fiscal_year) DO NOTHING;

-- 挿入したデータを確認
SELECT 
    company_name,
    fiscal_year,
    revenue,
    net_income,
    file_count
FROM 
    public.storage_metadata
ORDER BY 
    company_name, fiscal_year;

-- 財務サマリービューの確認
SELECT * FROM public.financial_summary;