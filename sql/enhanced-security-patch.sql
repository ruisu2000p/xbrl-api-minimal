-- ========= Enhanced Security and Rate Limiting Patch =========
-- This patch improves the API key system with better security and automatic rate limit resets

-- ========= 1) api_keys の堅牢化 =========
ALTER TABLE api_keys
  ALTER COLUMN user_id SET NOT NULL;

-- 速度＆一意性（任意だが推奨）
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_keyhash_unique ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- レート値は 0 以上
ALTER TABLE api_keys
  ALTER COLUMN rate_limit_per_minute SET DEFAULT 100,
  ALTER COLUMN rate_limit_per_hour   SET DEFAULT 10000,
  ALTER COLUMN rate_limit_per_day    SET DEFAULT 100000;

ALTER TABLE api_keys
  ADD CONSTRAINT chk_rate_limits_nonneg
  CHECK (rate_limit_per_minute >= 0 AND rate_limit_per_hour >= 0 AND rate_limit_per_day >= 0);

-- RLS（insert/updateはクライアント禁止。発行・失効は service_role で実施）
DROP POLICY IF EXISTS "Users can create their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;

-- 読み取りは自分のキーのみ
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
CREATE POLICY "users_read_own_keys"
ON api_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- クライアントからの書込みを全面禁止（Edge Functionsのみ）
DROP POLICY IF EXISTS "deny client write keys" ON api_keys;
CREATE POLICY "deny client write keys"
ON api_keys FOR ALL TO authenticated
USING (false) WITH CHECK (false);

-- ========= 2) usage_counters をAtomic更新に =========
-- 既存の関数を置き換え（境界で自動リセット＆インクリメント＆現在値を返す）
CREATE OR REPLACE FUNCTION incr_usage_and_get(p_key_id uuid)
RETURNS TABLE(minute_count int, hour_count int, day_count int) LANGUAGE plpgsql AS $$
DECLARE
  now_ts timestamptz := now();
  this_min timestamptz := date_trunc('minute', now_ts);
  this_hour timestamptz := date_trunc('hour',   now_ts);
  this_day  timestamptz := date_trunc('day',    now_ts);
BEGIN
  -- レコードが無ければ作成
  INSERT INTO usage_counters (api_key_id, minute_count, hour_count, day_count, total_count,
                              last_reset_minute, last_reset_hour, last_reset_day, created_at, updated_at)
  VALUES (p_key_id, 0, 0, 0, 0, this_min, this_hour, this_day, now_ts, now_ts)
  ON CONFLICT (api_key_id) DO NOTHING; -- api_key_idをユニークにする必要があるかも

  -- 既存行を境界に合わせてリセット＆加算
  UPDATE usage_counters
  SET
    minute_count = (CASE WHEN last_reset_minute < this_min THEN 0 ELSE minute_count END) + 1,
    hour_count   = (CASE WHEN last_reset_hour   < this_hour THEN 0 ELSE hour_count   END) + 1,
    day_count    = (CASE WHEN last_reset_day    < this_day  THEN 0 ELSE day_count    END) + 1,
    total_count  = total_count + 1,
    last_reset_minute = CASE WHEN last_reset_minute < this_min THEN this_min ELSE last_reset_minute END,
    last_reset_hour   = CASE WHEN last_reset_hour   < this_hour THEN this_hour ELSE last_reset_hour END,
    last_reset_day    = CASE WHEN last_reset_day    < this_day  THEN this_day  ELSE last_reset_day END,
    updated_at = now_ts
  WHERE api_key_id = p_key_id;

  RETURN QUERY
  SELECT uc.minute_count, uc.hour_count, uc.day_count
  FROM usage_counters uc
  WHERE uc.api_key_id = p_key_id;
END;
$$;

-- usage_countersのapi_key_idにユニーク制約を追加（ON CONFLICTのため）
ALTER TABLE usage_counters
  ADD CONSTRAINT usage_counters_api_key_id_key UNIQUE (api_key_id);

-- RLS: usage_counters は service_roleのみ操作（既に有効化済想定）
DROP POLICY IF EXISTS "Service role can access all usage counters" ON usage_counters;
DROP POLICY IF EXISTS "deny client write usage" ON usage_counters;
CREATE POLICY "deny client write usage"
ON usage_counters FOR ALL TO authenticated
USING (false) WITH CHECK (false);
-- （Edge Functionsは service_role なのでRLSを通過）

-- ========= 3) （任意）更新日時の自動更新トリガ =========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= 4) Service Role ポリシーの削除（冗長なため） =========
DROP POLICY IF EXISTS "Service role can access all API keys" ON api_keys;
DROP POLICY IF EXISTS "Service role can access all usage counters" ON usage_counters;

-- Note: companies テーブルはそのままでOK（公開したい/したくないに応じてRLSを付けてください）