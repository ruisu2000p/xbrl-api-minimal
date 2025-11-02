-- Add plan_type and access_state columns for Pay→Create Account flow
-- Supports both Freemium (instant signup) and Standard (pay-first) plans
-- Note: plan_id already exists as UUID, so we use plan_type instead

-- Step 1: Add columns to the actual table (private.user_subscriptions)
alter table private.user_subscriptions
  add column if not exists plan_type text not null default 'freemium',
  add column if not exists access_state text not null default 'active';

-- Add CHECK constraints for valid values
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_plan_type'
  ) then
    alter table private.user_subscriptions
      add constraint check_plan_type
        check (plan_type in ('freemium', 'standard'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_access_state'
  ) then
    alter table private.user_subscriptions
      add constraint check_access_state
        check (access_state in ('active', 'suspended', 'cancelled'));
  end if;
end $$;

-- Step 2: Add indexes for faster queries
create index if not exists idx_user_subscriptions_plan_type
  on private.user_subscriptions(plan_type);

create index if not exists idx_user_subscriptions_access_state
  on private.user_subscriptions(access_state);

create index if not exists idx_user_subscriptions_user_id
  on private.user_subscriptions(user_id);

create index if not exists idx_user_subscriptions_stripe_subscription
  on private.user_subscriptions(stripe_subscription_id);

-- Step 3: Add stripe_customer_id to profiles (private schema)
alter table private.profiles
  add column if not exists stripe_customer_id text;

create index if not exists idx_profiles_stripe_customer
  on private.profiles(stripe_customer_id);

-- Step 4: Recreate the public view to include new columns
drop view if exists public.user_subscriptions cascade;

create view public.user_subscriptions as
select
  id,
  user_id,
  plan_id,
  plan_type,
  status,
  billing_cycle,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  cancelled_at,
  trial_end,
  stripe_subscription_id,
  stripe_customer_id,
  created_at,
  updated_at,
  -- Pause/resume columns
  is_paused,
  pause_behavior,
  pause_resumes_at,
  paused_at,
  resumed_at,
  pause_reason,
  pending_action,
  -- New columns
  access_state
from private.user_subscriptions;

-- Enable RLS on the view
alter view public.user_subscriptions set (security_invoker = on);

-- Step 5: Recreate profiles view to include stripe_customer_id
drop view if exists public.profiles cascade;

create view public.profiles as
select
  id,
  email,
  full_name,
  company_name,
  plan,
  trial_ends_at,
  email_status,
  created_at,
  updated_at,
  stripe_customer_id
from private.profiles;

alter view public.profiles set (security_invoker = on);

-- Step 6: Grant permissions
grant select, update on private.user_subscriptions to authenticated;
grant select on public.user_subscriptions to authenticated;
grant all on private.user_subscriptions to service_role;
grant all on public.user_subscriptions to service_role;

grant select on public.profiles to authenticated;
grant select on private.profiles to authenticated;
grant all on private.profiles to service_role;
grant all on public.profiles to service_role;

-- Step 7: Add comments
comment on column private.user_subscriptions.plan_type is 'Plan type: freemium or standard';
comment on column private.user_subscriptions.access_state is 'Access state: active, suspended, or cancelled';
comment on column private.profiles.stripe_customer_id is 'Stripe customer ID for billing';
