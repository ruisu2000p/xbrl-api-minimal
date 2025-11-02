-- Add pause/resume columns to user_subscriptions table
-- Supports Stripe pause_collection feature

alter table public.user_subscriptions
  add column if not exists is_paused boolean not null default false,
  add column if not exists pause_behavior text check (pause_behavior in ('void','mark_uncollectible','keep_as_draft')),
  add column if not exists pause_resumes_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists resumed_at timestamptz,
  add column if not exists pause_reason text,
  add column if not exists pending_action text;

-- Index for efficient pause status queries
create index if not exists idx_user_subscriptions_paused
  on public.user_subscriptions (is_paused, pause_resumes_at desc);

-- Add comment
comment on column public.user_subscriptions.is_paused is 'Whether payment collection is currently paused';
comment on column public.user_subscriptions.pause_behavior is 'Stripe pause behavior: void, mark_uncollectible, or keep_as_draft';
comment on column public.user_subscriptions.pause_resumes_at is 'Scheduled automatic resume date (if set)';
comment on column public.user_subscriptions.paused_at is 'When the subscription was paused';
comment on column public.user_subscriptions.resumed_at is 'When the subscription was last resumed';
comment on column public.user_subscriptions.pause_reason is 'User-provided reason for pausing';
comment on column public.user_subscriptions.pending_action is 'Pending subscription action awaiting webhook confirmation';
