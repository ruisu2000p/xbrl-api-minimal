-- RLS (Row Level Security) ポリシーの設定

-- 1. api_keys テーブルのRLS有効化
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- api_keys: ユーザーは自分のAPIキーのみ表示可能
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- api_keys: ユーザーは自分のAPIキーのみ更新可能（無効化など）
DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
CREATE POLICY "Users can update own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- api_keys: サービスロールのみがAPIキーを作成可能
DROP POLICY IF EXISTS "Service role can insert API keys" ON api_keys;
CREATE POLICY "Service role can insert API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 2. companies テーブルのRLS有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- companies: 認証されたユーザーまたはAPIキー保持者のみアクセス可能
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;
CREATE POLICY "Authenticated users can view companies" ON companies
  FOR SELECT USING (
    auth.uid() IS NOT NULL OR
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE key_hash = current_setting('request.header.x-api-key-hash', true)
      AND status = 'active'
    )
  );

-- 3. markdown_files_metadata テーブルのRLS有効化
ALTER TABLE markdown_files_metadata ENABLE ROW LEVEL SECURITY;

-- markdown_files_metadata: 認証されたユーザーまたはAPIキー保持者のみアクセス可能
DROP POLICY IF EXISTS "Authenticated users can view metadata" ON markdown_files_metadata;
CREATE POLICY "Authenticated users can view metadata" ON markdown_files_metadata
  FOR SELECT USING (
    auth.uid() IS NOT NULL OR
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE key_hash = current_setting('request.header.x-api-key-hash', true)
      AND status = 'active'
    )
  );

-- 4. user_subscriptions テーブルのRLS有効化
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- user_subscriptions: ユーザーは自分のサブスクリプションのみ表示可能
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- user_subscriptions: ユーザーは自分のサブスクリプションのみ更新可能
DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. subscription_plans テーブルのRLS有効化
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- subscription_plans: 全ユーザーがプラン一覧を表示可能
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;
CREATE POLICY "Anyone can view active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- 6. api_usage_logs テーブルのRLS有効化
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- api_usage_logs: ユーザーは自分のAPIキーの使用ログのみ表示可能
DROP POLICY IF EXISTS "Users can view own API usage logs" ON api_usage_logs;
CREATE POLICY "Users can view own API usage logs" ON api_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_usage_logs.api_key_id
      AND api_keys.user_id = auth.uid()
    )
  );

-- 7. Storage RLSポリシーの注意事項
-- Storage のRLSポリシーは Supabase Dashboard から設定する必要があります
-- Dashboard > Storage > Policies から以下のポリシーを設定してください：
--
-- markdown-files バケット:
--   - SELECT: auth.uid() IS NOT NULL (認証済みユーザーは読み取り可能)
--
-- documents バケット:
--   - SELECT: auth.uid() IS NOT NULL (認証済みユーザーは読み取り可能)

-- RLS関数: APIキーのハッシュを検証する関数
DROP FUNCTION IF EXISTS verify_api_key_hash(text);
CREATE OR REPLACE FUNCTION verify_api_key_hash(key_hash text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM api_keys
    WHERE api_keys.key_hash = key_hash
    AND api_keys.status = 'active'
    AND (api_keys.expires_at IS NULL OR api_keys.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS関数: ユーザーのプランレベルを取得
DROP FUNCTION IF EXISTS get_user_plan_tier(uuid);
CREATE OR REPLACE FUNCTION get_user_plan_tier(user_id uuid)
RETURNS text AS $$
DECLARE
  plan_tier text;
BEGIN
  SELECT sp.name INTO plan_tier
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = $1
  AND us.status = 'active'
  LIMIT 1;

  RETURN COALESCE(plan_tier, 'Free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON POLICY "Users can view own API keys" ON api_keys IS 'ユーザーは自分のAPIキーのみ閲覧可能';
COMMENT ON POLICY "Users can update own API keys" ON api_keys IS 'ユーザーは自分のAPIキーの無効化などが可能';
COMMENT ON POLICY "Authenticated users can view companies" ON companies IS '認証済みユーザーまたは有効なAPIキー保持者のみ企業データにアクセス可能';
COMMENT ON POLICY "Authenticated users can view metadata" ON markdown_files_metadata IS '認証済みユーザーまたは有効なAPIキー保持者のみメタデータにアクセス可能';
COMMENT ON POLICY "Users can view own subscriptions" ON user_subscriptions IS 'ユーザーは自分のサブスクリプション情報のみ閲覧可能';
COMMENT ON POLICY "Anyone can view active plans" ON subscription_plans IS 'アクティブなプラン情報は全ユーザーが閲覧可能';
COMMENT ON POLICY "Users can view own API usage logs" ON api_usage_logs IS 'ユーザーは自分のAPIキーの使用ログのみ閲覧可能';