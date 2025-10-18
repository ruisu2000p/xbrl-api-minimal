-- メールアドレスのユニーク制約強化
-- 既存の重複を防ぎ、大文字小文字の違いによる重複登録を防止

-- 1. 既存メールの正規化（trim + lowercase）
-- バックアップとして、変更前の値をログ
do $$
declare
  affected_count integer;
begin
  -- 変更が必要なレコード数を取得
  select count(*)
  into affected_count
  from private.profiles
  where email is not null
    and email <> trim(lower(email));

  if affected_count > 0 then
    raise notice 'Normalizing % email addresses...', affected_count;

    -- メールアドレスを正規化
    update private.profiles
    set email = trim(lower(email))
    where email is not null
      and email <> trim(lower(email));

    raise notice 'Normalized % email addresses', affected_count;
  else
    raise notice 'No email addresses need normalization';
  end if;
end $$;

-- 2. 重複チェック（マイグレーション前に確認）
do $$
declare
  duplicate_count integer;
begin
  select count(*)
  into duplicate_count
  from (
    select lower(email), count(*) as cnt
    from private.profiles
    where email is not null
    group by lower(email)
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception 'Found % duplicate email addresses. Please resolve duplicates before adding unique constraint.', duplicate_count;
  end if;
end $$;

-- 3. ユニーク制約の追加（lower(email)に対して）
-- NULLは許容、非NULLのみ一意
create unique index if not exists ux_private_profiles_email_lower_notnull
  on private.profiles (lower(email))
  where email is not null;

-- インデックスにコメント追加
comment on index ux_private_profiles_email_lower_notnull is
'Ensures email uniqueness (case-insensitive) for non-null values';

-- 4. 既存のemailインデックスの確認
-- すでに単純なemailインデックスがある場合は、そのままでもOK（検索用として）
-- create index if not exists idx_private_profiles_email on private.profiles(email);

raise notice 'Email uniqueness constraint successfully added';
