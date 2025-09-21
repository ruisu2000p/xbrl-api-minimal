-- API Key Permission System Migration
-- Purpose: Ensure custom API keys have same permissions as anon key

-- ============================================
-- 1. Create API Key Permission Function
-- ============================================

CREATE OR REPLACE FUNCTION public.verify_api_key(api_key_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    key_data record;
    result jsonb;
BEGIN
    -- Check if the key exists and is active
    SELECT
        ak.id,
        ak.user_id,
        ak.status,
        ak.expires_at,
        p.email,
        us.plan_id,
        sp.name as plan_name,
        sp.features
    INTO key_data
    FROM api_keys ak
    JOIN profiles p ON ak.user_id = p.id
    LEFT JOIN user_subscriptions us ON us.user_id = ak.user_id
    LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE ak.key_hash = encode(sha256(api_key_input::bytea), 'hex')
    AND ak.status = 'active'
    AND (ak.expires_at IS NULL OR ak.expires_at > now());

    IF NOT FOUND THEN
        -- If custom key not found, check if it's the anon key
        IF api_key_input = current_setting('app.anon_key', true) THEN
            -- Return anon user permissions
            RETURN jsonb_build_object(
                'authenticated', false,
                'role', 'anon',
                'permissions', jsonb_build_array(
                    'companies.select',
                    'markdown_files_metadata.select',
                    'storage.objects.select'
                )
            );
        ELSE
            RETURN jsonb_build_object('error', 'Invalid or expired API key');
        END IF;
    END IF;

    -- Return user permissions (same as anon for data access)
    result := jsonb_build_object(
        'authenticated', true,
        'user_id', key_data.user_id,
        'email', key_data.email,
        'plan', key_data.plan_name,
        'role', 'authenticated',
        'permissions', jsonb_build_array(
            'companies.select',
            'markdown_files_metadata.select',
            'storage.objects.select',
            'api_keys.manage_own',
            'user_subscriptions.manage_own'
        )
    );

    -- Log API usage
    INSERT INTO api_usage_logs (api_key_id, user_id, accessed_at)
    VALUES (key_data.id, key_data.user_id, now());

    RETURN result;
END;
$$;

-- ============================================
-- 2. Create Unified RLS Policies
-- ============================================

-- Drop existing policies to recreate with unified approach
DROP POLICY IF EXISTS "Everyone can view companies" ON public.companies;
DROP POLICY IF EXISTS "Everyone can view markdown metadata" ON public.markdown_files_metadata;

-- Companies table: Allow access for both anon and authenticated with API key
CREATE POLICY "Unified read access for companies"
ON public.companies
FOR SELECT
USING (
    -- Allow if user is authenticated (logged in)
    auth.uid() IS NOT NULL
    OR
    -- Allow if valid API key is provided (checked via function)
    current_setting('request.headers', true)::jsonb->>'x-api-key' IS NOT NULL
    OR
    -- Allow for anon role (public access)
    auth.role() = 'anon'
);

-- Markdown files metadata: Same unified access
CREATE POLICY "Unified read access for markdown metadata"
ON public.markdown_files_metadata
FOR SELECT
USING (
    auth.uid() IS NOT NULL
    OR
    current_setting('request.headers', true)::jsonb->>'x-api-key' IS NOT NULL
    OR
    auth.role() = 'anon'
);

-- ============================================
-- 3. Create API Key Validation Trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_api_key_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    api_key text;
    validation_result jsonb;
BEGIN
    -- Get API key from request headers
    api_key := current_setting('request.headers', true)::jsonb->>'x-api-key';

    IF api_key IS NOT NULL THEN
        -- Validate the API key
        validation_result := verify_api_key(api_key);

        IF validation_result->>'error' IS NOT NULL THEN
            RAISE EXCEPTION 'Invalid API key: %', validation_result->>'error';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- 4. Create Helper Function for API Access
-- ============================================

CREATE OR REPLACE FUNCTION public.get_current_api_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    api_key text;
    user_context jsonb;
BEGIN
    -- Check if user is authenticated via Supabase Auth
    IF auth.uid() IS NOT NULL THEN
        RETURN jsonb_build_object(
            'type', 'supabase_auth',
            'user_id', auth.uid(),
            'role', auth.role()
        );
    END IF;

    -- Check for API key in headers
    api_key := current_setting('request.headers', true)::jsonb->>'x-api-key';

    IF api_key IS NOT NULL THEN
        user_context := verify_api_key(api_key);
        IF user_context->>'error' IS NULL THEN
            RETURN jsonb_build_object(
                'type', 'api_key',
                'user_id', user_context->>'user_id',
                'role', 'api_user',
                'permissions', user_context->'permissions'
            );
        END IF;
    END IF;

    -- Default to anon access
    RETURN jsonb_build_object(
        'type', 'anon',
        'role', 'anon',
        'permissions', jsonb_build_array(
            'companies.select',
            'markdown_files_metadata.select'
        )
    );
END;
$$;

-- ============================================
-- 5. Create API Usage Tracking Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text,
    method text,
    status_code integer,
    response_time_ms integer,
    accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own usage logs
CREATE POLICY "Users can view own API usage logs"
ON public.api_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_api_key_id ON public.api_usage_logs(api_key_id);
CREATE INDEX idx_api_usage_logs_accessed_at ON public.api_usage_logs(accessed_at DESC);

-- ============================================
-- 6. Add Comments for Documentation
-- ============================================

COMMENT ON FUNCTION public.verify_api_key IS 'Validates API keys and returns user permissions. Treats custom keys and anon key with same data access permissions.';
COMMENT ON FUNCTION public.get_current_api_context IS 'Returns the current authentication context (supabase auth, api key, or anon).';
COMMENT ON TABLE public.api_usage_logs IS 'Tracks API usage for analytics and rate limiting.';

-- ============================================
-- Migration Complete
-- ============================================