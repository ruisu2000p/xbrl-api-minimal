-- ========= Add missing columns to api_keys table =========
-- This script adds rate limit columns if they don't exist

-- Check and add rate_limit_per_minute
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'rate_limit_per_minute') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_minute INTEGER DEFAULT 100;
    END IF;
END $$;

-- Check and add rate_limit_per_hour
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'rate_limit_per_hour') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_hour INTEGER DEFAULT 10000;
    END IF;
END $$;

-- Check and add rate_limit_per_day
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'rate_limit_per_day') THEN
        ALTER TABLE api_keys ADD COLUMN rate_limit_per_day INTEGER DEFAULT 100000;
    END IF;
END $$;

-- Check and add key_suffix if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'key_suffix') THEN
        ALTER TABLE api_keys ADD COLUMN key_suffix TEXT;
    END IF;
END $$;

-- Check and add masked_key if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'masked_key') THEN
        ALTER TABLE api_keys ADD COLUMN masked_key TEXT;
    END IF;
END $$;

-- Check and add updated_at if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_keys' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE api_keys ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Verify the structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys'
ORDER BY ordinal_position;