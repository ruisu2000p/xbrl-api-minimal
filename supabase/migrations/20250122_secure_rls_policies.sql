-- =====================================================
-- セキュアなRLSポリシー設定
-- 本番環境用のRow Level Security実装
-- =====================================================

-- 1. RLSを有効化（本番環境では必須）
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 2. 既存のポリシーをすべて削除（クリーンスタート）
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can create own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
DROP POLICY IF EXISTS "Service role full access" ON api_keys;

-- =====================================================
-- 3. 本番環境用RLSポリシー
-- =====================================================

-- 3.1 認証済みユーザーは自分のAPIキーのみ表示可能
CREATE POLICY "auth_users_view_own_keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (
    -- Supabase認証ユーザーの場合
    user_id = auth.uid()
    OR
    -- カスタム認証の場合（JWTクレームから取得）
    user_id = (auth.jwt() ->> 'user_id')::uuid
  );

-- 3.2 認証済みユーザーは自分のAPIキーを作成可能
CREATE POLICY "auth_users_create_own_keys"
  ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    user_id = (auth.jwt() ->> 'user_id')::uuid
  );

-- 3.3 認証済みユーザーは自分のAPIキーを更新可能
CREATE POLICY "auth_users_update_own_keys"
  ON api_keys
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    user_id = (auth.jwt() ->> 'user_id')::uuid
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    user_id = (auth.jwt() ->> 'user_id')::uuid
  );

-- 3.4 認証済みユーザーは自分のAPIキーを削除可能
CREATE POLICY "auth_users_delete_own_keys"
  ON api_keys
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    user_id = (auth.jwt() ->> 'user_id')::uuid
  );

-- =====================================================
-- 4. APIキー認証用の特別なポリシー
-- =====================================================

-- 4.1 有効なAPIキーによるデータアクセス
-- （他のテーブル用の例）
CREATE OR REPLACE FUNCTION has_valid_api_key()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key_header text;
  key_hash text;
  is_valid boolean;
BEGIN
  -- リクエストヘッダーからAPIキーを取得
  api_key_header := current_setting('request.headers', true)::json->>'x-api-key';
  
  IF api_key_header IS NULL THEN
    RETURN false;
  END IF;
  
  -- APIキーをハッシュ化
  key_hash := encode(digest(api_key_header, 'sha256'), 'hex');
  
  -- 有効なAPIキーか確認
  SELECT EXISTS (
    SELECT 1 FROM api_keys
    WHERE key_hash = key_hash
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
  ) INTO is_valid;
  
  RETURN is_valid;
END;
$$;

-- =====================================================
-- 5. 開発環境用の条件付きポリシー
-- =====================================================

-- 環境変数で制御可能な開発モードポリシー
CREATE OR REPLACE FUNCTION is_development_mode()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- 環境変数 DEVELOPMENT_MODE が 'true' の場合のみ有効
  RETURN coalesce(
    current_setting('app.development_mode', true) = 'true',
    false
  );
END;
$$;

-- 開発モードでのみ動作するポリシー
CREATE POLICY "development_mode_access"
  ON api_keys
  FOR ALL
  TO anon, authenticated
  USING (is_development_mode())
  WITH CHECK (is_development_mode());

-- =====================================================
-- 6. セキュリティ監査用のビュー
-- =====================================================

CREATE OR REPLACE VIEW v_api_key_audit AS
SELECT
  ak.id,
  ak.user_id,
  u.email as user_email,
  ak.name,
  ak.tier,
  ak.created_at,
  ak.last_used_at,
  ak.expires_at,
  ak.is_active,
  CASE
    WHEN ak.expires_at < NOW() THEN '期限切れ'
    WHEN NOT ak.is_active THEN '無効'
    WHEN ak.last_used_at IS NULL THEN '未使用'
    WHEN ak.last_used_at < NOW() - INTERVAL '30 days' THEN '30日以上未使用'
    ELSE 'アクティブ'
  END as status,
  CASE
    WHEN ak.expires_at < NOW() THEN true
    WHEN NOT ak.is_active THEN true
    WHEN ak.last_used_at < NOW() - INTERVAL '90 days' THEN true
    ELSE false
  END as should_revoke
FROM api_keys ak
LEFT JOIN auth.users u ON ak.user_id = u.id
WHERE ak.user_id = auth.uid()
   OR exists(select 1 from auth.users where id = auth.uid() and raw_app_meta_data->>'role' = 'admin');

-- =====================================================
-- 7. APIキー使用状況の記録
-- =====================================================

CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 使用ログのRLS
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_usage_logs"
  ON api_key_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM api_keys WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. レート制限の実装
-- =====================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- 直近1分間のリクエスト数をカウント
  SELECT COUNT(*)
  INTO request_count
  FROM api_key_usage_logs
  WHERE api_key_id = p_api_key_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  RETURN request_count < p_limit;
END;
$$;

-- =====================================================
-- 9. セキュリティアラート
-- =====================================================

CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  alert_type TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 不審なアクティビティを検出する関数
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 短時間に大量のAPIキーが作成された場合
  IF (
    SELECT COUNT(*)
    FROM api_keys
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour'
  ) > 5 THEN
    INSERT INTO security_alerts (user_id, alert_type, description, severity)
    VALUES (
      NEW.user_id,
      'excessive_api_key_creation',
      '1時間以内に5個以上のAPIキーが作成されました',
      'medium'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_suspicious_api_key_creation
  AFTER INSERT ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION detect_suspicious_activity();

-- =====================================================
-- コメント
-- =====================================================

COMMENT ON TABLE api_keys IS 'APIキー管理テーブル（RLS有効）';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA256ハッシュ化されたAPIキー';
COMMENT ON COLUMN api_keys.is_active IS 'APIキーの有効/無効状態';
COMMENT ON POLICY "auth_users_view_own_keys" ON api_keys IS '認証済みユーザーは自分のAPIキーのみ表示可能';