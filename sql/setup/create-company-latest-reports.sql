-- ================================================
-- Create company_latest_reports table
-- ================================================

-- Drop existing table if needed (be careful with this in production!)
-- DROP TABLE IF EXISTS public.company_latest_reports CASCADE;

-- Create the table
CREATE TABLE IF NOT EXISTS public.company_latest_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    company_name TEXT NOT NULL,
    fiscal_year TEXT NOT NULL,
    report_type TEXT DEFAULT 'annual',
    file_count INTEGER DEFAULT 0,
    storage_path TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_latest_reports_ticker 
    ON company_latest_reports(ticker);
CREATE INDEX IF NOT EXISTS idx_company_latest_reports_fiscal_year 
    ON company_latest_reports(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_company_latest_reports_company_id 
    ON company_latest_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_company_latest_reports_ticker_fiscal 
    ON company_latest_reports(ticker, fiscal_year);

-- Enable Row Level Security
ALTER TABLE company_latest_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow everyone to read
DROP POLICY IF EXISTS "Enable read for all users" ON company_latest_reports;
CREATE POLICY "Enable read for all users" ON company_latest_reports
    FOR SELECT USING (true);

-- Allow service role to do everything
DROP POLICY IF EXISTS "Enable all for service role" ON company_latest_reports;
CREATE POLICY "Enable all for service role" ON company_latest_reports
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to read
DROP POLICY IF EXISTS "Enable read for authenticated users" ON company_latest_reports;
CREATE POLICY "Enable read for authenticated users" ON company_latest_reports
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_company_latest_reports_updated_at ON company_latest_reports;
CREATE TRIGGER update_company_latest_reports_updated_at 
    BEFORE UPDATE ON company_latest_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Populate with FY2016 data
-- ================================================

-- Insert FY2016 data from companies table
INSERT INTO company_latest_reports (
    company_id,
    ticker,
    company_name,
    fiscal_year,
    report_type,
    file_count,
    storage_path
)
SELECT 
    c.id,
    c.ticker,
    c.name,
    'FY2016',
    'annual',
    22, -- Average number of files per company
    'FY2016/' || c.ticker || '/PublicDoc'
FROM companies c
WHERE c.description LIKE '%FY2016%'
ON CONFLICT DO NOTHING;

-- ================================================
-- Verify the setup
-- ================================================

-- Count records
SELECT 
    'Total records in company_latest_reports' as description,
    COUNT(*) as count
FROM company_latest_reports;

-- Count FY2016 records
SELECT 
    'FY2016 records' as description,
    COUNT(*) as count
FROM company_latest_reports
WHERE fiscal_year = 'FY2016';

-- Sample data
SELECT 
    ticker,
    company_name,
    fiscal_year,
    file_count,
    storage_path
FROM company_latest_reports
WHERE fiscal_year = 'FY2016'
LIMIT 5;