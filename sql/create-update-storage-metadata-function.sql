-- update_storage_metadata関数の作成
-- Supabase SQL Editorで実行してください

-- 既存の関数を削除（存在する場合）
DROP FUNCTION IF EXISTS public.update_storage_metadata;

-- storage_metadataテーブルを更新する関数
CREATE OR REPLACE FUNCTION public.update_storage_metadata(
    p_company_id VARCHAR(50),
    p_company_name TEXT,
    p_fiscal_year VARCHAR(10),
    p_file_path TEXT,
    p_file_count INTEGER,
    p_revenue NUMERIC DEFAULT NULL,
    p_operating_income NUMERIC DEFAULT NULL,
    p_net_income NUMERIC DEFAULT NULL,
    p_total_assets NUMERIC DEFAULT NULL,
    p_net_assets NUMERIC DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- UPSERT操作：存在すればUPDATE、なければINSERT
    INSERT INTO public.storage_metadata (
        company_id,
        company_name,
        fiscal_year,
        file_path,
        file_count,
        revenue,
        operating_income,
        net_income,
        total_assets,
        net_assets,
        has_financial_data,
        updated_at
    ) VALUES (
        p_company_id,
        p_company_name,
        p_fiscal_year,
        p_file_path,
        p_file_count,
        p_revenue,
        p_operating_income,
        p_net_income,
        p_total_assets,
        p_net_assets,
        (p_revenue IS NOT NULL OR p_operating_income IS NOT NULL OR p_net_income IS NOT NULL),
        NOW()
    )
    ON CONFLICT (company_id, fiscal_year)
    DO UPDATE SET
        company_name = EXCLUDED.company_name,
        file_path = EXCLUDED.file_path,
        file_count = EXCLUDED.file_count,
        revenue = COALESCE(EXCLUDED.revenue, storage_metadata.revenue),
        operating_income = COALESCE(EXCLUDED.operating_income, storage_metadata.operating_income),
        net_income = COALESCE(EXCLUDED.net_income, storage_metadata.net_income),
        total_assets = COALESCE(EXCLUDED.total_assets, storage_metadata.total_assets),
        net_assets = COALESCE(EXCLUDED.net_assets, storage_metadata.net_assets),
        has_financial_data = (
            COALESCE(EXCLUDED.revenue, storage_metadata.revenue) IS NOT NULL OR
            COALESCE(EXCLUDED.operating_income, storage_metadata.operating_income) IS NOT NULL OR
            COALESCE(EXCLUDED.net_income, storage_metadata.net_income) IS NOT NULL
        ),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 関数の権限設定
GRANT EXECUTE ON FUNCTION public.update_storage_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_storage_metadata TO service_role;
GRANT EXECUTE ON FUNCTION public.update_storage_metadata TO anon;

-- 確認
SELECT 'update_storage_metadata function created successfully' as status;