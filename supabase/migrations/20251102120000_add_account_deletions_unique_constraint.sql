-- Add unique constraint for idempotency on account_deletions table
-- Prevents duplicate deletion attempts with the same idempotency key

-- Add unique constraint on idempotency_key (if not already present)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'account_deletions_idempotency_key_unique'
  ) then
    alter table public.account_deletions
      add constraint account_deletions_idempotency_key_unique
      unique (idempotency_key);
  end if;
end $$;

-- Add index for faster lookups by user_id
create index if not exists idx_account_deletions_user_id
  on public.account_deletions (user_id);

-- Add index for faster lookups by created_at (for cleanup/auditing)
create index if not exists idx_account_deletions_created_at
  on public.account_deletions (created_at desc);

-- Add comment
comment on constraint account_deletions_idempotency_key_unique on public.account_deletions is
  'Ensures each idempotency key can only be used once, preventing duplicate deletion attempts';
