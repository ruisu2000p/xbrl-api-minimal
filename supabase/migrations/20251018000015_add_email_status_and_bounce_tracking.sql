-- Phase 3: Email bounce/complaint tracking
-- enum 型（なければ作成）
do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_status') then
    create type public.email_status as enum ('unknown','verified','bounced','complained');
  end if;
end $$;

-- private.profiles に email_status 列（未作成なら追加）
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='private' and table_name='profiles' and column_name='email_status'
  ) then
    alter table private.profiles
      add column email_status public.email_status not null default 'unknown';
    create index if not exists idx_private_profiles_email_status on private.profiles(email_status);
    comment on column private.profiles.email_status is 'Webhookにより更新: verified/bounced/complained';
  end if;
end $$;

-- idempotency用の軽量ログ（重複配信対策）
create table if not exists public.mail_event_log (
  id bigserial primary key,
  provider text not null,
  event_id text not null,
  email text not null,
  received_at timestamptz not null default now(),
  unique(provider, event_id)
);

-- mail_event_log の RLS（service role で更新するため select のみ許可）
alter table public.mail_event_log enable row level security;

-- ユーザーは自分のメールイベントログのみ閲覧可能
create policy "Users can view their own mail events"
  on public.mail_event_log
  for select
  using (
    email = (
      select email
      from auth.users
      where id = auth.uid()
    )
  );

-- インデックス（パフォーマンス向上）
create index if not exists idx_mail_event_log_email on public.mail_event_log(email);
create index if not exists idx_mail_event_log_received_at on public.mail_event_log(received_at);

-- コメント
comment on table public.mail_event_log is 'Email webhook events log for idempotency and auditing';
comment on column public.mail_event_log.provider is 'Email provider: sendgrid, ses, postmark';
comment on column public.mail_event_log.event_id is 'Unique event ID from provider';
comment on column public.mail_event_log.email is 'Email address that triggered the event';
comment on column public.mail_event_log.received_at is 'When the webhook was received';
