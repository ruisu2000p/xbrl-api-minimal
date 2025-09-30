-- SECURITY DEFINER関数を作成してService Role Keyの使用を削減
-- RLSをバイパスする必要がある処理をSQL関数に集約

-- ===================================================================
-- 1. APIキー検証関数（bcrypt版）
-- ===================================================================
create or replace function private.verify_api_key_secure(
  api_key_input text
)
returns table (
  user_id uuid,
  key_id uuid,
  tier text,
  is_active boolean
)
security definer
set search_path = public, private
language plpgsql
as $$
declare
  key_record record;
begin
  -- APIキーのプレフィックスを抽出（最初の12文字）
  declare
    key_prefix text := substring(api_key_input from 1 for 12);
  begin
    -- プレフィックスでフィルタリング
    for key_record in
      select
        ak.id,
        ak.user_id,
        ak.tier,
        ak.is_active,
        ak.key_hash
      from private.api_keys ak
      where ak.key_prefix = key_prefix
        and ak.is_active = true
    loop
      -- bcryptでハッシュを検証
      -- pgcryptoのcrypt関数を使用
      if key_record.key_hash = crypt(api_key_input, key_record.key_hash) then
        -- 最終使用日時を更新
        update private.api_keys
        set last_used_at = now()
        where id = key_record.id;

        -- 結果を返す
        return query
        select
          key_record.user_id,
          key_record.id,
          key_record.tier,
          key_record.is_active;
        return;
      end if;
    end loop;
  end;

  -- マッチするキーが見つからない場合は空の結果を返す
  return;
end;
$$;

comment on function private.verify_api_key_secure is
'APIキーを検証し、有効な場合はユーザー情報を返す。SECURITY DEFINERで実行されRLSをバイパス。';

-- ===================================================================
-- 2. APIキー一覧取得関数
-- ===================================================================
create or replace function private.list_api_keys_secure()
returns table (
  id uuid,
  name text,
  key_prefix text,
  tier text,
  is_active boolean,
  created_at timestamptz,
  last_used_at timestamptz
)
security definer
set search_path = public, private
language plpgsql
as $$
begin
  -- 認証チェック
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- ユーザー自身のAPIキーのみを返す
  return query
  select
    ak.id,
    ak.name,
    ak.key_prefix,
    ak.tier,
    ak.is_active,
    ak.created_at,
    ak.last_used_at
  from private.api_keys ak
  where ak.user_id = auth.uid()
    and ak.is_active = true
  order by ak.created_at desc;
end;
$$;

comment on function private.list_api_keys_secure is
'認証されたユーザーのAPIキー一覧を取得。SECURITY DEFINERで実行されRLSをバイパス。';

-- ===================================================================
-- 3. APIキー作成関数
-- ===================================================================
create or replace function private.create_api_key_secure(
  key_name text,
  key_hash_input text,
  key_prefix_input text,
  key_suffix_input text default null,
  tier_input text default 'free'
)
returns table (
  id uuid,
  name text,
  key_prefix text,
  tier text,
  created_at timestamptz
)
security definer
set search_path = public, private
language plpgsql
as $$
declare
  new_key_id uuid;
begin
  -- 認証チェック
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- 既存のアクティブなキーを無効化
  update private.api_keys
  set is_active = false
  where user_id = auth.uid()
    and is_active = true;

  -- 新しいキーを作成
  insert into private.api_keys (
    user_id,
    name,
    key_hash,
    key_prefix,
    key_suffix,
    tier,
    is_active
  ) values (
    auth.uid(),
    key_name,
    key_hash_input,
    key_prefix_input,
    key_suffix_input,
    tier_input,
    true
  )
  returning private.api_keys.id into new_key_id;

  -- 作成したキー情報を返す
  return query
  select
    ak.id,
    ak.name,
    ak.key_prefix,
    ak.tier,
    ak.created_at
  from private.api_keys ak
  where ak.id = new_key_id;
end;
$$;

comment on function private.create_api_key_secure is
'認証されたユーザーの新しいAPIキーを作成。既存のキーは自動的に無効化される。';

-- ===================================================================
-- 4. APIキー無効化関数
-- ===================================================================
create or replace function private.revoke_api_key_secure(
  key_id_input uuid
)
returns boolean
security definer
set search_path = public, private
language plpgsql
as $$
declare
  affected_rows int;
begin
  -- 認証チェック
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- ユーザー自身のキーのみを無効化
  update private.api_keys
  set is_active = false
  where id = key_id_input
    and user_id = auth.uid()
    and is_active = true;

  get diagnostics affected_rows = row_count;

  return affected_rows > 0;
end;
$$;

comment on function private.revoke_api_key_secure is
'認証されたユーザーの指定されたAPIキーを無効化。';

-- ===================================================================
-- 5. pgcrypto拡張が有効か確認
-- ===================================================================
do $$
begin
  if not exists (
    select 1 from pg_extension where extname = 'pgcrypto'
  ) then
    raise notice 'pgcrypto extension is not installed. Installing...';
    create extension if not exists pgcrypto;
  end if;
end $$;

-- ===================================================================
-- 6. 関数の実行権限を設定
-- ===================================================================

-- 認証されたユーザーに実行権限を付与
grant execute on function private.verify_api_key_secure(text) to authenticated;
grant execute on function private.list_api_keys_secure() to authenticated;
grant execute on function private.create_api_key_secure(text, text, text, text, text) to authenticated;
grant execute on function private.revoke_api_key_secure(uuid) to authenticated;

-- anon（未認証）ユーザーにはverify_api_key_secureのみ実行可能
grant execute on function private.verify_api_key_secure(text) to anon;

-- ===================================================================
-- 完了メッセージ
-- ===================================================================
do $$
begin
  raise notice 'SECURITY DEFINER functions created successfully';
  raise notice '- private.verify_api_key_secure: API key verification';
  raise notice '- private.list_api_keys_secure: List user API keys';
  raise notice '- private.create_api_key_secure: Create new API key';
  raise notice '- private.revoke_api_key_secure: Revoke API key';
end $$;
