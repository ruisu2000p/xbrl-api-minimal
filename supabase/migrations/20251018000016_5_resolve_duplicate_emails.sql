-- 重複メールアドレスの解決
-- マイグレーション17の前に実行する必要がある

-- 1. 重複メールアドレスを確認して表示
do $$
declare
  r record;
begin
  raise notice '=== Duplicate Email Addresses ===';

  for r in (
    select lower(email) as email_lower, count(*) as cnt, array_agg(id) as user_ids
    from private.profiles
    where email is not null
    group by lower(email)
    having count(*) > 1
    order by count(*) desc
  ) loop
    raise notice 'Email: %, Count: %, User IDs: %', r.email_lower, r.cnt, r.user_ids;
  end loop;
end $$;

-- 2. 重複解決戦略: 古いレコードを保持し、新しいレコードのメールを匿名化
do $$
declare
  r record;
  v_keep_id uuid;
  v_anonymize_id uuid;
  v_timestamp bigint;
begin
  -- 各重複グループを処理
  for r in (
    select lower(email) as email_lower, array_agg(id order by created_at asc) as user_ids
    from private.profiles
    where email is not null
    group by lower(email)
    having count(*) > 1
  ) loop

    -- 最初（最古）のユーザーを保持
    v_keep_id := r.user_ids[1];

    raise notice 'Keeping user % with email %', v_keep_id, r.email_lower;

    -- 残りのユーザーのメールを匿名化
    for i in 2..array_length(r.user_ids, 1) loop
      v_anonymize_id := r.user_ids[i];
      v_timestamp := extract(epoch from now())::bigint + i; -- 各レコードに異なるタイムスタンプ

      update private.profiles
      set email = split_part(email, '@', 1) || '#duplicate#' || v_timestamp || '@' || split_part(email, '@', 2),
          email_status = 'unknown'
      where id = v_anonymize_id;

      raise notice 'Anonymized duplicate user % (was: %)', v_anonymize_id, r.email_lower;
    end loop;
  end loop;

  raise notice '=== Duplicate resolution completed ===';
end $$;

-- 3. 解決後の確認
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
    raise warning 'Still found % duplicate email addresses after resolution', duplicate_count;
  else
    raise notice 'No duplicate email addresses remain. Ready for unique constraint.';
  end if;
end $$;
