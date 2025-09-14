-- Security Improvements Migration
-- Date: 2025-01-14
-- Purpose: Fix security issues identified by Supabase advisors

-- ============================================
-- 1. Enable RLS on tables that need it
-- ============================================

-- Note: wrappers_fdw_stats table requires owner permissions
-- Contact Supabase support or use dashboard to enable RLS on this table

-- ============================================
-- 2. Fix function search_path issues
-- ============================================

-- Set search_path for all functions to prevent security issues
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.parse_markdown_file_path(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_key_hash(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_simple_api_key() SET search_path = public, pg_temp;
ALTER FUNCTION public.extract_file_type(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.extract_file_order(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_api_key(uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_japanese_companies(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_api_key() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.extract_file_info(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_companies_with_description(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_test_api_key() SET search_path = public, pg_temp;

-- Functions with multiple overloads
ALTER FUNCTION public.log_api_usage_compat(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_api_usage_compat(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_api_usage_compat(text, text, integer) SET search_path = public, pg_temp;

ALTER FUNCTION public.incr_usage_and_get(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.incr_usage_and_get(uuid) SET search_path = public, pg_temp;

ALTER FUNCTION public.generate_simple_api_key(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_api_key(uuid) SET search_path = public, pg_temp;

-- ============================================
-- 3. Add RLS policies for better security
-- ============================================

-- Ensure RLS is enabled on all public tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markdown_files_metadata ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create better RLS policies (if not exists)
-- ============================================

-- Drop and recreate policies to ensure they're secure
DO $$
BEGIN
    -- API Keys: Users can only see/manage their own keys
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'api_keys'
        AND policyname = 'Users can only manage their own API keys'
    ) THEN
        CREATE POLICY "Users can only manage their own API keys"
        ON public.api_keys
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- User Subscriptions: Users can only see/manage their own subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions'
        AND policyname = 'Users can only manage their own subscriptions'
    ) THEN
        CREATE POLICY "Users can only manage their own subscriptions"
        ON public.user_subscriptions
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Profiles: Users can only see/update their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Users can only manage their own profile'
    ) THEN
        CREATE POLICY "Users can only manage their own profile"
        ON public.profiles
        FOR ALL
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- ============================================
-- 5. Add indexes for better performance
-- ============================================

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_markdown_files_metadata_company_id ON public.markdown_files_metadata(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_ticker_code ON public.companies(ticker_code);

-- ============================================
-- 6. Add audit triggers for important tables
-- ============================================

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    operation text NOT NULL,
    user_id uuid,
    changed_at timestamp with time zone DEFAULT now(),
    old_data jsonb,
    new_data jsonb
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
    auth.uid() IN (
        SELECT id FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'admin'
    )
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs(table_name, operation, user_id, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs(table_name, operation, user_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs(table_name, operation, user_id, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Add audit triggers to important tables
DROP TRIGGER IF EXISTS audit_trigger_api_keys ON public.api_keys;
CREATE TRIGGER audit_trigger_api_keys
AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger_user_subscriptions ON public.user_subscriptions;
CREATE TRIGGER audit_trigger_user_subscriptions
AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- ============================================
-- 7. Add comments for documentation
-- ============================================

COMMENT ON TABLE public.api_keys IS 'Stores API keys for external access to the system';
COMMENT ON TABLE public.user_subscriptions IS 'Manages user subscription plans and billing';
COMMENT ON TABLE public.profiles IS 'User profile information and settings';
COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans and their features';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for important data changes';

COMMENT ON COLUMN public.api_keys.key_hash IS 'SHA-256 hash of the API key for security';
COMMENT ON COLUMN public.user_subscriptions.plan_id IS 'Foreign key to subscription_plans table';
COMMENT ON COLUMN public.profiles.api_quota_per_day IS 'Daily API request limit for the user';

-- ============================================
-- Migration completed successfully
-- ============================================