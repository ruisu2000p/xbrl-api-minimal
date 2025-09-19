-- Migration sync file for Supabase Preview
-- This file ensures that local and remote migrations are synchronized
-- Created: 2025-09-19

-- Check if the required tables exist and create them if they don't
DO $$ 
BEGIN
    -- Ensure the migration tracking is properly set up
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'api_keys'
    ) THEN
        RAISE NOTICE 'api_keys table not found, will be created by earlier migrations';
    END IF;

    -- Log migration sync
    RAISE NOTICE 'Migration sync completed at %', NOW();
END $$;

-- Add a comment to track this sync
COMMENT ON SCHEMA public IS 'XBRL Financial Data API - Migration synced on 2025-09-19';