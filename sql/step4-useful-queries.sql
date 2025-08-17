-- ステップ4: 便利なクエリ集
-- ビューとデータが準備できたら、これらのクエリを使ってデータ分析ができます

-- ========================================
-- 1. 基本的なデータ確認
-- ========================================

-- 全データの確認
SELECT * FROM public.storage_metadata;

-- 財務サマリーの確認
SELECT * FROM public.financial_summary;

-- データ品質の確認
SELECT * FROM public.data_quality_check;

-- ========================================
-- 2. 財務分析クエリ
-- ========================================

-- 売上高TOP10企業（FY2021）
SELECT 
    company_name,
    revenue AS "売上高（百万円）",
    net_income AS "当期純利益（百万円）",
    net_margin AS "純利益率（%）",
    roe AS "ROE（%）"
FROM 
    public.financial_summary
WHERE 
    fiscal_year = 'FY2021'
ORDER BY 
    revenue DESC NULLS LAST
LIMIT 10;

-- ROEランキング（FY2021）
SELECT 
    company_name,
    roe AS "ROE（%）",
    revenue AS "売上高（百万円）",
    net_income AS "当期純利益（百万円）"
FROM 
    public.financial_summary
WHERE 
    fiscal_year = 'FY2021'
    AND roe IS NOT NULL
ORDER BY 
    roe DESC
LIMIT 20;

-- ========================================
-- 3. 年度比較クエリ
-- ========================================

-- 同一企業の年度比較
SELECT 
    company_name,
    fiscal_year,
    revenue AS "売上高",
    net_income AS "純利益",
    LAG(revenue) OVER (PARTITION BY company_id ORDER BY fiscal_year) AS "前年売上高",
    CASE 
        WHEN LAG(revenue) OVER (PARTITION BY company_id ORDER BY fiscal_year) > 0
        THEN ROUND(((revenue - LAG(revenue) OVER (PARTITION BY company_id ORDER BY fiscal_year)) / 
                    LAG(revenue) OVER (PARTITION BY company_id ORDER BY fiscal_year) * 100)::numeric, 2)
        ELSE NULL
    END AS "成長率（%）"
FROM 
    public.storage_metadata
WHERE 
    company_name LIKE '%亀田%'
ORDER BY 
    company_name, fiscal_year;

-- ========================================
-- 4. データ管理クエリ
-- ========================================

-- データが不完全な企業リスト
SELECT 
    company_id,
    company_name,
    fiscal_year,
    data_status,
    financial_metrics_status,
    file_count
FROM 
    public.data_quality_check
WHERE 
    data_status != 'Complete'
    OR financial_metrics_status = 'Missing'
ORDER BY 
    fiscal_year, company_name;

-- 年度別のデータ充実度
SELECT 
    fiscal_year,
    COUNT(*) AS "企業数",
    COUNT(CASE WHEN has_financial_data THEN 1 END) AS "財務データあり",
    AVG(file_count) AS "平均ファイル数",
    ROUND(COUNT(CASE WHEN has_financial_data THEN 1 END)::numeric / COUNT(*) * 100, 2) AS "データ充実度（%）"
FROM 
    public.storage_metadata
GROUP BY 
    fiscal_year
ORDER BY 
    fiscal_year;

-- ========================================
-- 5. ストレージ管理クエリ
-- ========================================

-- Storageパスの確認
SELECT * FROM public.storage_paths
WHERE company_name LIKE '%亀田%';

-- ファイル数が多い企業TOP10
SELECT 
    company_name,
    fiscal_year,
    file_count,
    storage_path
FROM 
    public.storage_paths
ORDER BY 
    file_count DESC
LIMIT 10;

-- ========================================
-- 6. 統計クエリ
-- ========================================

-- 全体統計
SELECT 
    (SELECT COUNT(DISTINCT company_id) FROM storage_metadata) AS "総企業数",
    (SELECT COUNT(DISTINCT company_id) FROM storage_metadata WHERE fiscal_year = 'FY2021') AS "FY2021企業数",
    (SELECT COUNT(DISTINCT company_id) FROM storage_metadata WHERE fiscal_year = 'FY2016') AS "FY2016企業数",
    (SELECT COUNT(*) FROM storage_metadata WHERE has_financial_data = true) AS "財務データ保有数",
    (SELECT SUM(file_count) FROM storage_metadata) AS "総ファイル数";

-- ========================================
-- 7. エクスポート用クエリ（CSV出力向け）
-- ========================================

-- 財務データエクスポート（FY2021）
SELECT 
    company_id AS "企業ID",
    company_name AS "企業名",
    fiscal_year AS "年度",
    revenue AS "売上高（百万円）",
    operating_income AS "営業利益（百万円）",
    net_income AS "当期純利益（百万円）",
    total_assets AS "総資産（百万円）",
    net_assets AS "純資産（百万円）",
    ROUND((operating_income::numeric / NULLIF(revenue, 0) * 100), 2) AS "営業利益率（%）",
    ROUND((net_income::numeric / NULLIF(revenue, 0) * 100), 2) AS "純利益率（%）",
    ROUND((net_income::numeric / NULLIF(total_assets, 0) * 100), 2) AS "ROA（%）",
    ROUND((net_income::numeric / NULLIF(net_assets, 0) * 100), 2) AS "ROE（%）"
FROM 
    public.storage_metadata
WHERE 
    fiscal_year = 'FY2021'
    AND has_financial_data = true
ORDER BY 
    revenue DESC NULLS LAST;