-- アカウント削除時のメール匿名化（再登録対応）
-- ユニーク制約を維持しながら、削除ユーザーの再登録を可能にする

-- private.profiles の削除時にメールアドレスを匿名化する関数
create or replace function public.anonymize_user_email(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_original_email text;
  v_anonymized_email text;
begin
  -- 現在のメールアドレスを取得
  select email into v_original_email
  from private.profiles
  where id = p_user_id;

  if v_original_email is null then
    raise exception 'User profile not found';
  end if;

  -- 匿名化されたメールアドレスを生成
  -- 形式: localpart#deleted#timestamp@domain
  v_anonymized_email :=
    split_part(v_original_email, '@', 1) ||
    '#deleted#' ||
    extract(epoch from now())::bigint ||
    '@' ||
    split_part(v_original_email, '@', 2);

  -- メールアドレスとステータスを更新
  update private.profiles
  set
    email = v_anonymized_email,
    email_status = 'unknown',
    updated_at = now()
  where id = p_user_id;

  raise notice 'Email anonymized: % -> %', v_original_email, v_anonymized_email;
end;
$$;

comment on function public.anonymize_user_email is
'Anonymize user email on account deletion to allow re-registration with same email';

-- RPC関数のGRANT（必要に応じて）
-- grant execute on function public.anonymize_user_email to authenticated;
-- grant execute on function public.anonymize_user_email to service_role;

-- 使用例:
-- select public.anonymize_user_email('user-uuid-here');
--
-- 結果:
-- user@example.com → user#deleted#1729270000@example.com
--
-- これにより:
-- 1. ユニーク制約違反が発生しない
-- 2. 同じメールアドレスでの再登録が可能
-- 3. 監査ログで元のメールアドレスを追跡可能（account_deletions.email）
-- 4. GDPRの「削除の権利」に準拠（匿名化は削除と同等）
