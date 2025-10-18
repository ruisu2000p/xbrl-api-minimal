-- Fix search_path for purge_old_stripe_webhook_events function
--
-- Purpose: セキュリティ強化
-- - search_path を固定して SQL インジェクションを防止

DROP FUNCTION IF EXISTS public.purge_old_stripe_webhook_events(INT);

CREATE OR REPLACE FUNCTION public.purge_old_stripe_webhook_events(
  retention_days INT DEFAULT 90
)
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← 固定 search_path
AS $$
DECLARE
  result BIGINT;
BEGIN
  DELETE FROM public.stripe_webhook_events
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS result = ROW_COUNT;
  RETURN QUERY SELECT result;
END;
$$;

COMMENT ON FUNCTION public.purge_old_stripe_webhook_events IS 'Purge Stripe webhook events older than specified days (default: 90) - with fixed search_path';
