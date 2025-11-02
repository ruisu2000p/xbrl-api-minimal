-- Migration: Add welcome_email_log table for idempotent welcome email sending
-- Created: 2025-11-02

-- Create welcome_email_log table to track sent welcome emails
create table if not exists public.welcome_email_log (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  email text not null,
  plan_type text,
  billing_cycle text
);

-- Enable RLS
alter table public.welcome_email_log enable row level security;

-- Policy: Users can read their own welcome email log
create policy "user can read own welcome log"
  on public.welcome_email_log
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Comment
comment on table public.welcome_email_log is 'Tracks welcome emails sent to users to ensure idempotent delivery';
