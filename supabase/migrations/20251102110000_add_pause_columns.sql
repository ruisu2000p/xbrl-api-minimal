-- Add pause/resume columns to user_subscriptions table
-- Supports Stripe pause_collection feature

-- Step 1: Add columns to the actual table (private.user_subscriptions)
alter table private.user_subscriptions
  add column if not exists is_paused boolean not null default false,
  add column if not exists pause_behavior text check (pause_behavior in ('void','mark_uncollectible','keep_as_draft')),
  add column if not exists pause_resumes_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists resumed_at timestamptz,
  add column if not exists pause_reason text,
  add column if not exists pending_action text;

-- Step 2: Create index on the private table
create index if not exists idx_user_subscriptions_paused
  on private.user_subscriptions (is_paused, pause_resumes_at desc);

-- Step 3: Recreate the public view to include new columns
drop view if exists public.user_subscriptions cascade;

create view public.user_subscriptions as
select
  id,
  user_id,
  plan_id,
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
  -- New pause/resume columns
  is_paused,
  pause_behavior,
  pause_resumes_at,
  paused_at,
  resumed_at,
  pause_reason,
  pending_action
from private.user_subscriptions;

-- Step 4: Enable RLS on the view
alter view public.user_subscriptions set (security_invoker = on);

-- Step 5: Grant permissions
grant select, update on private.user_subscriptions to authenticated;
grant select on public.user_subscriptions to authenticated;
grant all on private.user_subscriptions to service_role;
grant all on public.user_subscriptions to service_role;

-- Step 6: Add comments
comment on column private.user_subscriptions.is_paused is 'Whether payment collection is currently paused';
comment on column private.user_subscriptions.pause_behavior is 'Stripe pause behavior: void, mark_uncollectible, or keep_as_draft';
comment on column private.user_subscriptions.pause_resumes_at is 'Scheduled automatic resume date (if set)';
comment on column private.user_subscriptions.paused_at is 'When the subscription was paused';
comment on column private.user_subscriptions.resumed_at is 'When the subscription was last resumed';
comment on column private.user_subscriptions.pause_reason is 'User-provided reason for pausing';
comment on column private.user_subscriptions.pending_action is 'Pending subscription action awaiting webhook confirmation';

comment on view public.user_subscriptions is 'Public view of user subscriptions with RLS enabled';
