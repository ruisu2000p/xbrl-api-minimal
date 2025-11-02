-- Migration: Add status tracking to welcome_email_log for exactly-once delivery
-- Created: 2025-11-02

-- Add status and attempt tracking columns
alter table public.welcome_email_log
  add column if not exists status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  add column if not exists first_sent_at timestamptz,
  add column if not exists last_attempt_at timestamptz not null default now(),
  add column if not exists attempts int not null default 0,
  add column if not exists last_error text;

-- Rename sent_at to match new schema (for existing rows)
alter table public.welcome_email_log
  rename column sent_at to first_sent_at;

-- Update existing rows to 'sent' status
update public.welcome_email_log
  set status = 'sent',
      attempts = 1
  where status = 'pending';

-- Add index for status queries
create index if not exists idx_welcome_email_log_status
  on public.welcome_email_log (status);

-- Comment
comment on column public.welcome_email_log.status is 'Email delivery status: pending (reserved), sent (delivered), failed (error)';
