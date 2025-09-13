-- 財務指標テーブル作成
CREATE TABLE IF NOT EXISTS financial_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 基本情報
    company_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    fiscal_year TEXT NOT NULL,
    document_id TEXT NOT NULL,
    
    -- 損益計算書（P/L）- 単位：円
    revenue BIGINT,                    -- 売上高
    operating_profit BIGINT,           -- 営業利益
    ordinary_profit BIGINT,            -- 経常利益
    net_income BIGINT,                -- 当期純利益
    gross_profit BIGINT,              -- 売上総利益
    cost_of_sales BIGINT,             -- 売上原価
    
    -- 貸借対照表（B/S）- 単位：円
    total_assets BIGINT,              -- 総資産
    total_liabilities BIGINT,         -- 総負債
    net_assets BIGINT,                -- 純資産
    current_assets BIGINT,            -- 流動資産
    fixed_assets BIGINT,              -- 固定資産
    current_liabilities BIGINT,       -- 流動負債
    long_term_liabilities BIGINT,     -- 固定負債
    
    -- キャッシュフロー計算書（C/F）- 単位：円
    operating_cash_flow BIGINT,       -- 営業キャッシュフロー
    investing_cash_flow BIGINT,       -- 投資キャッシュフロー
    financing_cash_flow BIGINT,       -- 財務キャッシュフロー
    free_cash_flow BIGINT,            -- フリーキャッシュフロー
    
    -- 株式関連
    shares_outstanding BIGINT,        -- 発行済株式数
    earnings_per_share DECIMAL(10,2), -- 1株当たり利益
    book_value_per_share DECIMAL(10,2), -- 1株当たり純資産
    dividends_per_share DECIMAL(10,2), -- 1株当たり配当
    
    -- 財務比率（パーセンテージ）
    roe DECIMAL(8,4),                       -- 自己資本利益率
    roa DECIMAL(8,4),                       -- 総資産利益率
    current_ratio DECIMAL(8,4),             -- 流動比率
    debt_to_equity_ratio DECIMAL(8,4),      -- 負債資本比率
    operating_margin DECIMAL(8,4),          -- 営業利益率
    net_margin DECIMAL(8,4),                -- 純利益率
    
    -- その他
    employees INTEGER,                 -- 従業員数
    average_salary BIGINT,            -- 平均年間給与（円）
    
    -- メタデータ
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence_score DECIMAL(5,2),    -- 抽出信頼度（0-100）
    source_sections TEXT[],           -- 抽出元セクション
    extraction_method TEXT CHECK (extraction_method IN ('pattern', 'table', 'manual')),
    
    -- 制約
    UNIQUE(company_id, document_id),
    
    -- 外部キー
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_financial_metrics_company_id ON financial_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_fiscal_year ON financial_metrics(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_company_year ON financial_metrics(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_revenue ON financial_metrics(revenue) WHERE revenue IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_metrics_roe ON financial_metrics(roe) WHERE roe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_metrics_extracted_at ON financial_metrics(extracted_at);

-- RLS（Row Level Security）の設定
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;

-- 読み取り専用ポリシー（認証不要）
CREATE POLICY "financial_metrics_select_policy" ON financial_metrics
    FOR SELECT USING (true);

-- 挿入・更新ポリシー（認証済みユーザーのみ）
CREATE POLICY "financial_metrics_insert_policy" ON financial_metrics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "financial_metrics_update_policy" ON financial_metrics
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 削除ポリシー（管理者のみ）
CREATE POLICY "financial_metrics_delete_policy" ON financial_metrics
    FOR DELETE USING (auth.jwt()->>'role' = 'admin');

-- 更新時刻自動更新のトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_metrics_updated_at
    BEFORE UPDATE ON financial_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 財務指標統計ビューの作成
CREATE OR REPLACE VIEW financial_metrics_stats AS
SELECT 
    fiscal_year,
    COUNT(*) as total_companies,
    COUNT(revenue) as companies_with_revenue,
    AVG(revenue) as avg_revenue,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue) as median_revenue,
    AVG(roe) as avg_roe,
    AVG(roa) as avg_roa,
    AVG(operating_margin) as avg_operating_margin,
    AVG(net_margin) as avg_net_margin,
    AVG(confidence_score) as avg_confidence_score
FROM financial_metrics
WHERE revenue IS NOT NULL AND revenue > 0
GROUP BY fiscal_year
ORDER BY fiscal_year DESC;

-- 業界別統計ビューの作成
CREATE OR REPLACE VIEW financial_metrics_by_sector AS
SELECT 
    c.sector,
    fm.fiscal_year,
    COUNT(*) as total_companies,
    AVG(fm.revenue) as avg_revenue,
    AVG(fm.roe) as avg_roe,
    AVG(fm.roa) as avg_roa,
    AVG(fm.operating_margin) as avg_operating_margin,
    AVG(fm.net_margin) as avg_net_margin
FROM financial_metrics fm
JOIN companies c ON fm.company_id = c.id
WHERE fm.revenue IS NOT NULL AND fm.revenue > 0
  AND c.sector IS NOT NULL
GROUP BY c.sector, fm.fiscal_year
ORDER BY c.sector, fm.fiscal_year DESC;

-- 時系列分析用ビューの作成
CREATE OR REPLACE VIEW financial_metrics_timeseries AS
SELECT 
    company_id,
    company_name,
    fiscal_year,
    revenue,
    operating_profit,
    net_income,
    total_assets,
    net_assets,
    roe,
    roa,
    LAG(revenue) OVER (PARTITION BY company_id ORDER BY fiscal_year) as prev_revenue,
    LAG(net_income) OVER (PARTITION BY company_id ORDER BY fiscal_year) as prev_net_income,
    LAG(total_assets) OVER (PARTITION BY company_id ORDER BY fiscal_year) as prev_total_assets,
    CASE 
        WHEN LAG(revenue) OVER (PARTITION BY company_id ORDER BY fiscal_year) > 0 
        THEN ((revenue - LAG(revenue) OVER (PARTITION BY company_id ORDER BY fiscal_year))::DECIMAL / LAG(revenue) OVER (PARTITION BY company_id ORDER BY fiscal_year)) * 100
        ELSE NULL 
    END as revenue_growth_rate,
    CASE 
        WHEN LAG(net_income) OVER (PARTITION BY company_id ORDER BY fiscal_year) > 0 
        THEN ((net_income - LAG(net_income) OVER (PARTITION BY company_id ORDER BY fiscal_year))::DECIMAL / LAG(net_income) OVER (PARTITION BY company_id ORDER BY fiscal_year)) * 100
        ELSE NULL 
    END as profit_growth_rate
FROM financial_metrics
ORDER BY company_id, fiscal_year;

-- データ品質チェック用関数
CREATE OR REPLACE FUNCTION check_financial_data_quality(p_company_id TEXT DEFAULT NULL)
RETURNS TABLE (
    company_id TEXT,
    company_name TEXT,
    fiscal_year TEXT,
    issues TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fm.company_id,
        fm.company_name,
        fm.fiscal_year,
        ARRAY(
            SELECT issue FROM (
                SELECT 'revenue_missing'::TEXT as issue WHERE fm.revenue IS NULL
                UNION ALL
                SELECT 'negative_revenue' WHERE fm.revenue < 0
                UNION ALL
                SELECT 'roe_out_of_range' WHERE fm.roe IS NOT NULL AND (fm.roe < -100 OR fm.roe > 100)
                UNION ALL
                SELECT 'roa_out_of_range' WHERE fm.roa IS NOT NULL AND (fm.roa < -50 OR fm.roa > 50)
                UNION ALL
                SELECT 'current_ratio_suspicious' WHERE fm.current_ratio IS NOT NULL AND (fm.current_ratio < 10 OR fm.current_ratio > 1000)
                UNION ALL
                SELECT 'low_confidence' WHERE fm.confidence_score < 50
                UNION ALL
                SELECT 'assets_liability_mismatch' WHERE fm.total_assets IS NOT NULL AND fm.total_liabilities IS NOT NULL AND fm.net_assets IS NOT NULL 
                    AND ABS(fm.total_assets - (fm.total_liabilities + fm.net_assets)) > fm.total_assets * 0.01
            ) issues
        ) as issues
    FROM financial_metrics fm
    WHERE (p_company_id IS NULL OR fm.company_id = p_company_id)
      AND (
          fm.revenue IS NULL OR fm.revenue < 0 OR
          (fm.roe IS NOT NULL AND (fm.roe < -100 OR fm.roe > 100)) OR
          (fm.roa IS NOT NULL AND (fm.roa < -50 OR fm.roa > 50)) OR
          (fm.current_ratio IS NOT NULL AND (fm.current_ratio < 10 OR fm.current_ratio > 1000)) OR
          fm.confidence_score < 50 OR
          (fm.total_assets IS NOT NULL AND fm.total_liabilities IS NOT NULL AND fm.net_assets IS NOT NULL 
           AND ABS(fm.total_assets - (fm.total_liabilities + fm.net_assets)) > fm.total_assets * 0.01)
      )
    ORDER BY fm.company_id, fm.fiscal_year;
END;
$$ LANGUAGE plpgsql;