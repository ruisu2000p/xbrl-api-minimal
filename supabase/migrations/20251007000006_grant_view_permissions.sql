-- Grant SELECT permissions on public VIEWs to authenticated users
-- Migration: 20251007000006_grant_view_permissions

-- Grant permissions on user_subscriptions VIEW
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.user_subscriptions TO anon;

-- Grant permissions on subscription_plans VIEW
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;

-- Verify the grants worked
SELECT
    table_schema,
    table_name,
    privilege_type,
    grantee
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('user_subscriptions', 'subscription_plans')
AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;
