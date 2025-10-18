-- 送信対象ユーザービュー
-- bounced/complained ユーザーを除外し、安全に送信できるユーザーのみを返す

-- 既存のビューがあれば削除
drop view if exists public.sendable_users;

-- 送信対象ユーザービュー作成
create view public.sendable_users as
select
  p.id,
  p.email,
  p.name,
  p.company,
  p.email_status,
  p.created_at,
  p.updated_at
from public.profiles p
where p.email_status in ('verified', 'unknown')
  and p.email is not null
  and p.email != '';

-- ビューにコメント追加
comment on view public.sendable_users is
'Safe email sending targets - excludes bounced and complained users';

-- RLS: ビューに対するポリシー（読み取り専用）
-- Service roleからのアクセスを想定しているため、特別なポリシーは不要
-- 必要に応じて特定ロールのみアクセス可能にする

-- インデックスの確認（profiles.email_statusは既に存在）
-- create index if not exists idx_profiles_email_status on public.profiles(email_status);

-- 集計用の補助ビュー（オプション）
create or replace view public.email_status_summary as
select
  email_status,
  count(*) as user_count,
  round(count(*) * 100.0 / sum(count(*)) over(), 2) as percentage
from public.profiles
where email is not null
group by email_status
order by user_count desc;

comment on view public.email_status_summary is
'Email status distribution summary for monitoring';

-- 権限付与（必要に応じて調整）
-- grant select on public.sendable_users to authenticated;
-- grant select on public.email_status_summary to authenticated;
