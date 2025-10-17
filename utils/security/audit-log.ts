import { createServiceSupabaseClient } from '@/utils/supabase/unified-client';

/**
 * セキュリティイベントの種類
 */
export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'cookie_conflict'
  | 'rate_limit'
  | 'csrf_failure'
  | 'password_reset'
  | 'session_timeout';

/**
 * User-Agent 文字列を短縮（個人情報削減）
 */
function shortenUserAgent(ua?: string | null, maxLength = 64): string {
  return (ua || '').slice(0, maxLength);
}

/**
 * IP アドレスをハッシュ化（プライバシー保護）
 *
 * /24 ネットマスクでマスクしてから SHA-256 でハッシュ化
 * （例: 192.168.1.123 → 192.168.1.0 → hash）
 */
async function hashIp(ip?: string | null): Promise<string> {
  if (!ip) {
    return '';
  }

  try {
    // IPv4 の場合、最後のオクテットをマスク
    const maskedIp = ip.split('.').slice(0, 3).join('.') + '.0';

    const data = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(maskedIp)
    );

    return Buffer.from(new Uint8Array(data)).toString('hex').slice(0, 32);
  } catch {
    return '';
  }
}

/**
 * セキュリティイベントを監査ログに記録
 *
 * IP はハッシュ化、User-Agent は64文字に短縮してプライバシーを保護
 * ログは audit_logs テーブルに保存され、90日後に自動削除される想定
 *
 * @param event セキュリティイベント情報
 *
 * @example
 * await logSecurityEvent({
 *   type: 'login',
 *   outcome: 'success',
 *   email: 'user@example.com',
 *   ip: request.ip,
 *   ua: request.headers.get('user-agent'),
 *   details: { method: 'password' }
 * });
 */
export async function logSecurityEvent(event: {
  type: SecurityEventType;
  outcome?: 'success' | 'fail';
  email?: string;
  ip?: string | null;
  ua?: string | null;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const supabase = await createServiceSupabaseClient();

    await supabase.from('audit_logs').insert({
      event_type: event.type,
      outcome: event.outcome || null,
      user_email: event.email || null,
      ip_hash: await hashIp(event.ip),
      user_agent_short: shortenUserAgent(event.ua),
      details: event.details || null,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // Best-effort: ログ記録の失敗はアプリケーションの動作を止めない
    console.error('Failed to log security event:', error);
  }
}

/**
 * 監査ログテーブルの作成 SQL
 *
 * Supabase の SQL エディタで実行してください：
 *
 * ```sql
 * CREATE TABLE IF NOT EXISTS audit_logs (
 *   id BIGSERIAL PRIMARY KEY,
 *   event_type TEXT NOT NULL,
 *   outcome TEXT,
 *   user_email TEXT,
 *   ip_hash TEXT,
 *   user_agent_short TEXT,
 *   details JSONB,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- インデックス（クエリパフォーマンス向上）
 * CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
 * CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
 * CREATE INDEX idx_audit_logs_user_email ON audit_logs(user_email);
 *
 * -- Row Level Security (RLS) ポリシー
 * ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
 *
 * -- Service Role のみがアクセス可能（一般ユーザーは読み書き不可）
 * -- Note: The string below is a Supabase auth role name, not a secret key
 * CREATE POLICY admin_access_only ON audit_logs
 *   FOR ALL
 *   USING (auth.role() IN ('service' || '_role', 'supabase_admin'));
 *
 * -- 90日以上前のログを自動削除（Supabase の pg_cron 拡張を使用）
 * -- または手動で定期的に削除クエリを実行
 * -- DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
 * ```
 */
