-- public.profiles ビューに email_status を追加

drop view if exists public.profiles cascade;

create view public.profiles
with (security_invoker = off, security_barrier = false) as
select
  id,
  email,
  full_name,
  company_name,
  plan,
  trial_ends_at,
  email_status,  -- 新規追加
  created_at,
  updated_at
from private.profiles;

-- Grant access to authenticated users
grant select on public.profiles to authenticated;
grant select on public.profiles to anon;

comment on view public.profiles is 'Public view of user profiles with RLS, exposing private.profiles data including email_status';
