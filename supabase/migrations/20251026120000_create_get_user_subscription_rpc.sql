-- RPC function to safely access private.user_subscriptions
-- This provides a stable API that won't be affected by schema or search_path issues

create or replace function public.get_user_subscription_snapshot(user_uuid uuid)
returns table (
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan_id uuid,
  cancelled_at timestamptz
)
language sql
security definer
set search_path = private, public
stable
as $$
  select
    stripe_customer_id,
    stripe_subscription_id,
    status,
    plan_id,
    cancelled_at
  from private.user_subscriptions
  where user_id = user_uuid
  limit 1;
$$;

-- Grant execute permission to authenticated users and service_role
grant execute on function public.get_user_subscription_snapshot(uuid) to authenticated, service_role;

-- Add comment for documentation
comment on function public.get_user_subscription_snapshot(uuid) is
'Retrieves subscription snapshot for a user. SECURITY DEFINER ensures it always has access to private schema regardless of caller permissions.';
