-- ==========================================
-- Index Optimization
-- ==========================================
-- Fix unindexed_foreign_keys and unused_index warnings

-- 1) Add missing indexes for foreign keys (performance improvement)
CREATE INDEX IF NOT EXISTS idx_api_key_rate_limits_api_key_id
ON private.api_key_rate_limits(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id
ON private.api_key_usage_logs(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_main_api_key_id
ON private.api_key_usage_logs_main(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id
ON private.api_usage(api_key_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id
ON private.user_subscriptions(plan_id);

-- 2) Drop unused indexes (reduce storage and maintenance overhead)
-- Note: Only drop if confirmed these queries are truly not used in your application

-- Check usage first before dropping
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE indexname IN (
--   'idx_api_storage_access_logs_api_key_id',
--   'idx_subscriptions_user_id',
--   'idx_api_usage_user_id',
--   'idx_api_usage_logs_api_key_id_fkey',
--   'idx_cron_job_logs_job_id',
--   'idx_api_keys_user_id',
--   'idx_api_keys_prefix',
--   'idx_api_keys_active',
--   'idx_api_usage_log_key_id',
--   'idx_user_subscriptions_user_id',
--   'idx_api_usage_logs_user_id'
-- );

-- Unused indexes to consider removing:
DROP INDEX IF EXISTS private.idx_api_storage_access_logs_api_key_id;
DROP INDEX IF EXISTS private.idx_subscriptions_user_id;
DROP INDEX IF EXISTS private.idx_api_usage_user_id;
DROP INDEX IF EXISTS private.idx_api_usage_logs_api_key_id_fkey;
DROP INDEX IF EXISTS public.idx_cron_job_logs_job_id;
DROP INDEX IF EXISTS private.idx_api_keys_user_id;
DROP INDEX IF EXISTS private.idx_api_keys_prefix;
DROP INDEX IF EXISTS private.idx_api_keys_active;
DROP INDEX IF EXISTS private.idx_api_usage_log_key_id;
DROP INDEX IF EXISTS private.idx_user_subscriptions_user_id;
DROP INDEX IF EXISTS private.idx_api_usage_logs_user_id;

-- 3) Comments
COMMENT ON INDEX private.idx_api_key_rate_limits_api_key_id IS 'Foreign key index for api_key_rate_limits.api_key_id';
COMMENT ON INDEX private.idx_api_key_usage_logs_api_key_id IS 'Foreign key index for api_key_usage_logs.api_key_id';
COMMENT ON INDEX private.idx_api_key_usage_logs_main_api_key_id IS 'Foreign key index for api_key_usage_logs_main.api_key_id';
COMMENT ON INDEX private.idx_api_usage_api_key_id IS 'Foreign key index for api_usage.api_key_id';
COMMENT ON INDEX private.idx_user_subscriptions_plan_id IS 'Foreign key index for user_subscriptions.plan_id';