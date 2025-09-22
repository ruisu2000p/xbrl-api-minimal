-- セキュリティ監査用テーブル

-- セキュリティイベントテーブル
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- インデックス追加
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);
CREATE INDEX idx_security_events_resolved ON security_events(resolved);

-- セキュリティ監査ログテーブル
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  request_headers JSONB,
  request_body JSONB,
  response_status INT,
  response_time_ms INT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX idx_audit_logs_created_at ON security_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX idx_audit_logs_api_key_id ON security_audit_logs(api_key_id);
CREATE INDEX idx_audit_logs_action ON security_audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON security_audit_logs(resource_type, resource_id);

-- IPブロックリストテーブル
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  blocked_by VARCHAR(100) DEFAULT 'SYSTEM',
  auto_blocked BOOLEAN DEFAULT FALSE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_active ON blocked_ips(is_active) WHERE is_active = TRUE;

-- レート制限違反記録テーブル
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255),
  request_count INT NOT NULL,
  limit_exceeded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  action_taken VARCHAR(50) -- 'THROTTLED', 'BLOCKED', 'WARNED'
);

CREATE INDEX idx_rate_limit_violations_identifier ON rate_limit_violations(identifier);
CREATE INDEX idx_rate_limit_violations_timestamp ON rate_limit_violations(limit_exceeded_at DESC);

-- CSPレポート用テーブル
CREATE TABLE IF NOT EXISTS csp_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_uri TEXT,
  referrer TEXT,
  violated_directive TEXT,
  effective_directive TEXT,
  original_policy TEXT,
  blocked_uri TEXT,
  status_code INT,
  script_sample TEXT,
  source_file TEXT,
  line_number INT,
  column_number INT,
  user_agent TEXT,
  ip_address INET,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_csp_reports_timestamp ON csp_reports(reported_at DESC);
CREATE INDEX idx_csp_reports_directive ON csp_reports(violated_directive);

-- アラート設定テーブル
CREATE TABLE IF NOT EXISTS security_alert_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_name VARCHAR(100) NOT NULL UNIQUE,
  event_type VARCHAR(50) NOT NULL,
  threshold_count INT NOT NULL DEFAULT 1,
  time_window_minutes INT NOT NULL DEFAULT 60,
  severity VARCHAR(20) NOT NULL,
  notification_channels JSONB DEFAULT '[]'::JSONB,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシー設定
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE csp_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alert_configs ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能なポリシー
CREATE POLICY "Admins can view security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage security events"
  ON security_events FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Service role full access to audit logs"
  ON security_audit_logs FOR ALL
  TO service_role
  USING (TRUE);

CREATE POLICY "Service role full access to blocked IPs"
  ON blocked_ips FOR ALL
  TO service_role
  USING (TRUE);

-- ビュー作成：最近のセキュリティイベントサマリー
CREATE OR REPLACE VIEW v_security_summary AS
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT ip_address) as unique_ips
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), event_type, severity
ORDER BY hour DESC, event_count DESC;

-- ビュー作成：高リスクIPアドレス
CREATE OR REPLACE VIEW v_high_risk_ips AS
SELECT
  ip_address,
  COUNT(*) as total_events,
  SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_events,
  SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_events,
  MAX(timestamp) as last_activity
FROM security_events
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY ip_address
HAVING COUNT(*) > 10 OR SUM(CASE WHEN severity IN ('CRITICAL', 'HIGH') THEN 1 ELSE 0 END) > 5
ORDER BY total_events DESC;

-- トリガー：自動IPブロック
CREATE OR REPLACE FUNCTION auto_block_suspicious_ip()
RETURNS TRIGGER AS $$
BEGIN
  -- 1時間以内に10回以上のCRITICALまたはHIGHイベントがあった場合自動ブロック
  IF NEW.severity IN ('CRITICAL', 'HIGH') THEN
    WITH recent_events AS (
      SELECT COUNT(*) as event_count
      FROM security_events
      WHERE ip_address = NEW.ip_address
        AND severity IN ('CRITICAL', 'HIGH')
        AND timestamp > NOW() - INTERVAL '1 hour'
    )
    INSERT INTO blocked_ips (ip_address, reason, auto_blocked, blocked_until)
    SELECT
      NEW.ip_address,
      'Auto-blocked: Too many ' || NEW.severity || ' events',
      TRUE,
      NOW() + INTERVAL '24 hours'
    FROM recent_events
    WHERE event_count >= 10
    ON CONFLICT (ip_address) DO UPDATE
      SET blocked_until = EXCLUDED.blocked_until,
          reason = EXCLUDED.reason;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_block_ip
AFTER INSERT ON security_events
FOR EACH ROW
EXECUTE FUNCTION auto_block_suspicious_ip();

-- 関数：セキュリティイベントの記録
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type VARCHAR,
  p_severity VARCHAR,
  p_details JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_api_key_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (
    event_type, severity, details, ip_address,
    user_agent, api_key_id, user_id
  )
  VALUES (
    p_event_type, p_severity, p_details, p_ip_address,
    p_user_agent, p_api_key_id, p_user_id
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数：IPアドレスがブロックされているか確認
CREATE OR REPLACE FUNCTION is_ip_blocked(p_ip_address INET)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM blocked_ips
    WHERE ip_address = p_ip_address
      AND is_active = TRUE
      AND (blocked_until IS NULL OR blocked_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- グラント設定
GRANT SELECT ON v_security_summary TO authenticated;
GRANT SELECT ON v_high_risk_ips TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event TO service_role;
GRANT EXECUTE ON FUNCTION is_ip_blocked TO anon, authenticated;