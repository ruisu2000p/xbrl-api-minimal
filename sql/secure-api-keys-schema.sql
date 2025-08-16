-- Secure API Keys Schema for XBRL API
-- Supabaseでこのスクリプトを実行してください

-- 1. APIキーテーブル（平文は保存しない）
create table if not exists public.api_keys (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,                 -- "Claude Desktop" など
  key_prefix     text not null,                 -- "sk_live_xbrl_xxxx" の先頭数文字
  key_hash       text not null unique,          -- sha256(base64) ハッシュ値
  scopes         text[] not null default '{read:markdown}',
  revoked        boolean not null default false,
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz,
  expires_at     timestamptz                    -- オプション：有効期限
);

-- インデックス
create index if not exists api_keys_user_id_idx on public.api_keys(user_id);
create index if not exists api_keys_hash_idx on public.api_keys(key_hash);
create index if not exists api_keys_created_idx on public.api_keys(created_at desc);

-- 2. ドキュメント管理テーブル（既存がある場合は改善版）
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references auth.users(id) on delete set null,
  path          text not null,                -- "edinet/2021/7203_有価証券報告書.md" など
  title         text,
  company_code  text,                         -- "7203", "S100L3K4" など
  company_name  text,                         -- "トヨタ自動車株式会社" など
  fiscal_year   text,                         -- "2021", "2022" など
  doc_type      text,                         -- "public", "audit" など
  storage_key   text not null,                -- Storageのオブジェクトキー
  file_size     bigint,                       -- ファイルサイズ（バイト）
  content_hash  text,                         -- MD5ハッシュ（重複チェック用）
  metadata      jsonb,                        -- その他のメタデータ
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- インデックス
create index if not exists documents_path_idx on public.documents(path);
create index if not exists documents_company_code_idx on public.documents(company_code);
create index if not exists documents_fiscal_year_idx on public.documents(fiscal_year);
create index if not exists documents_created_idx on public.documents(created_at desc);

-- 3. API利用ログ（レート制限・監査用）
create table if not exists public.api_access_logs (
  id            uuid primary key default gen_random_uuid(),
  api_key_id    uuid references public.api_keys(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  endpoint      text not null,
  method        text not null,
  status_code   integer,
  response_time_ms integer,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

-- インデックス（時系列クエリ用）
create index if not exists api_access_logs_key_time_idx on public.api_access_logs(api_key_id, created_at desc);
create index if not exists api_access_logs_user_time_idx on public.api_access_logs(user_id, created_at desc);
create index if not exists api_access_logs_created_idx on public.api_access_logs(created_at desc);

-- 4. RLS (Row Level Security) 設定
alter table public.api_keys enable row level security;
alter table public.documents enable row level security;
alter table public.api_access_logs enable row level security;

-- APIキー：自分のキーだけ見える/作れる/更新できる
create policy "api_keys_select_own"
  on public.api_keys for select 
  to authenticated
  using (auth.uid() = user_id);

create policy "api_keys_insert_own"
  on public.api_keys for insert 
  to authenticated
  with check (auth.uid() = user_id);

create policy "api_keys_update_own"
  on public.api_keys for update 
  to authenticated
  using (auth.uid() = user_id);

create policy "api_keys_delete_own"
  on public.api_keys for delete 
  to authenticated
  using (auth.uid() = user_id);

-- ドキュメント：認証済みユーザーは全て読める（企業共通データ）
create policy "documents_read_authenticated"
  on public.documents for select
  to authenticated
  using (true);

-- 管理者のみ書き込み可能（service_role経由）
create policy "documents_admin_write"
  on public.documents for all
  to service_role
  using (true);

-- APIアクセスログ：自分のログだけ見える
create policy "api_access_logs_select_own"
  on public.api_access_logs for select
  to authenticated
  using (auth.uid() = user_id);

-- 5. レート制限チェック関数
create or replace function check_rate_limit(
  p_api_key_id uuid,
  p_limit_per_minute integer default 60
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  -- 過去1分間のリクエスト数をカウント
  select count(*)
  into v_count
  from public.api_access_logs
  where api_key_id = p_api_key_id
    and created_at > now() - interval '1 minute';
  
  return v_count < p_limit_per_minute;
end;
$$;

-- 6. APIキー使用記録関数
create or replace function record_api_usage(
  p_api_key_id uuid,
  p_user_id uuid,
  p_endpoint text,
  p_method text,
  p_status_code integer default 200,
  p_response_time_ms integer default null,
  p_ip_address text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_log_id uuid;
begin
  -- ログ記録
  insert into public.api_access_logs (
    api_key_id, user_id, endpoint, method, 
    status_code, response_time_ms, ip_address, user_agent
  )
  values (
    p_api_key_id, p_user_id, p_endpoint, p_method,
    p_status_code, p_response_time_ms, p_ip_address, p_user_agent
  )
  returning id into v_log_id;
  
  -- APIキーの最終使用時刻を更新
  update public.api_keys
  set last_used_at = now()
  where id = p_api_key_id;
  
  return v_log_id;
end;
$$;

-- 7. APIキー統計取得関数
create or replace function get_api_key_stats(p_user_id uuid)
returns table(
  total_keys bigint,
  active_keys bigint,
  revoked_keys bigint,
  total_requests bigint,
  requests_today bigint,
  requests_this_month bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    count(distinct k.id) as total_keys,
    count(distinct k.id) filter (where not k.revoked) as active_keys,
    count(distinct k.id) filter (where k.revoked) as revoked_keys,
    count(l.id) as total_requests,
    count(l.id) filter (where l.created_at > current_date) as requests_today,
    count(l.id) filter (where l.created_at > date_trunc('month', current_date)) as requests_this_month
  from public.api_keys k
  left join public.api_access_logs l on l.api_key_id = k.id
  where k.user_id = p_user_id;
end;
$$;