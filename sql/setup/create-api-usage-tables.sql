-- API使用状況追跡テーブル
-- このスクリプトをSupabaseのSQL Editorで実行してください

-- 既存のテーブルがあれば削除（開発環境のみ）
-- DROP TABLE IF EXISTS api_usage_logs CASCADE;
-- DROP TABLE IF EXISTS api_usage_stats CASCADE;

-- API使用状況ログテーブル
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_code ON api_usage_logs(status_code);

-- 月次統計テーブル
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  total_response_time_ms BIGINT DEFAULT 0,
  unique_endpoints JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_user_id ON api_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_year_month ON api_usage_stats(year, month);

-- 統計を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_api_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 月次統計を更新
  INSERT INTO api_usage_stats (
    user_id,
    year,
    month,
    total_requests,
    successful_requests,
    failed_requests,
    total_response_time_ms
  )
  VALUES (
    NEW.user_id,
    EXTRACT(YEAR FROM NEW.created_at),
    EXTRACT(MONTH FROM NEW.created_at),
    1,
    CASE WHEN NEW.status_code < 400 THEN 1 ELSE 0 END,
    CASE WHEN NEW.status_code >= 400 THEN 1 ELSE 0 END,
    COALESCE(NEW.response_time_ms, 0)
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    total_requests = api_usage_stats.total_requests + 1,
    successful_requests = api_usage_stats.successful_requests + 
      CASE WHEN NEW.status_code < 400 THEN 1 ELSE 0 END,
    failed_requests = api_usage_stats.failed_requests + 
      CASE WHEN NEW.status_code >= 400 THEN 1 ELSE 0 END,
    total_response_time_ms = api_usage_stats.total_response_time_ms + 
      COALESCE(NEW.response_time_ms, 0),
    updated_at = NOW();

  -- APIキーの使用状況も更新
  IF NEW.api_key_id IS NOT NULL THEN
    UPDATE api_keys
    SET 
      total_requests = COALESCE(total_requests, 0) + 1,
      successful_requests = COALESCE(successful_requests, 0) + 
        CASE WHEN NEW.status_code < 400 THEN 1 ELSE 0 END,
      failed_requests = COALESCE(failed_requests, 0) + 
        CASE WHEN NEW.status_code >= 400 THEN 1 ELSE 0 END,
      last_used_at = NOW()
    WHERE id = NEW.api_key_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_update_api_usage_stats ON api_usage_logs;
CREATE TRIGGER trigger_update_api_usage_stats
  AFTER INSERT ON api_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_api_usage_stats();

-- RLS (Row Level Security) ポリシー
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のログのみ閲覧可能
CREATE POLICY "Users can view own usage logs" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage stats" ON api_usage_stats
  FOR SELECT USING (auth.uid() = user_id);

-- サービスロールは全てのログを挿入可能
CREATE POLICY "Service role can insert logs" ON api_usage_logs
  FOR INSERT WITH CHECK (true);

-- ヘルパー関数: 現在の月の使用状況を取得
CREATE OR REPLACE FUNCTION get_current_month_usage(p_user_id UUID)
RETURNS TABLE (
  total_requests INTEGER,
  successful_requests INTEGER,
  failed_requests INTEGER,
  remaining_quota INTEGER,
  quota_limit INTEGER
) AS $$
DECLARE
  v_quota_limit INTEGER := 1000; -- ベータ版のデフォルト制限
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.total_requests, 0) as total_requests,
    COALESCE(s.successful_requests, 0) as successful_requests,
    COALESCE(s.failed_requests, 0) as failed_requests,
    v_quota_limit - COALESCE(s.total_requests, 0) as remaining_quota,
    v_quota_limit as quota_limit
  FROM api_usage_stats s
  WHERE s.user_id = p_user_id
    AND s.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND s.month = EXTRACT(MONTH FROM CURRENT_DATE);
  
  -- データがない場合はデフォルト値を返す
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 0, 0, 0, v_quota_limit, v_quota_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 過去7日間のアクティビティを取得
CREATE OR REPLACE FUNCTION get_recent_activity(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  created_at TIMESTAMPTZ,
  success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.endpoint,
    l.method,
    l.status_code,
    l.created_at,
    l.status_code < 400 as success
  FROM api_usage_logs l
  WHERE l.user_id = p_user_id
    AND l.created_at >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 既存のAPIキーテーブルのカウンターをリセット（必要に応じて）
-- UPDATE api_keys 
-- SET 
--   total_requests = 0,
--   successful_requests = 0,
--   failed_requests = 0,
--   last_used_at = NULL
-- WHERE user_id IS NOT NULL;

-- コメント追加
COMMENT ON TABLE api_usage_logs IS 'API使用ログを記録するテーブル';
COMMENT ON TABLE api_usage_stats IS '月次のAPI使用統計を保持するテーブル';
COMMENT ON FUNCTION get_current_month_usage IS '現在の月のAPI使用状況を取得する関数';
COMMENT ON FUNCTION get_recent_activity IS '最近のAPIアクティビティを取得する関数';

-- 初期データクリア（開発環境でのみ実行）
-- DELETE FROM api_usage_logs;
-- DELETE FROM api_usage_stats;