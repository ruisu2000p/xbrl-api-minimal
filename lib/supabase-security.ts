/**
 * Supabaseセキュリティ設定
 * 開発環境と本番環境で異なるセキュリティ設定を管理
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// 環境判定
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isLocalAuth = process.env.NEXT_PUBLIC_USE_LOCAL_AUTH === 'true';

// セキュリティ設定
export const securityConfig = {
  // RLS設定
  enableRLS: !isDevelopment, // 本番環境でのみRLS有効

  // APIキー設定
  useServiceRoleKey: isDevelopment, // 開発環境でのみService Role Key使用

  // レート制限
  rateLimit: {
    enabled: !isDevelopment,
    maxRequestsPerMinute: isDevelopment ? 1000 : 100,
  },

  // セキュリティモニタリング
  monitoring: {
    enabled: !isDevelopment,
    logSuspiciousActivity: true,
    alertOnExcessiveApiKeyCreation: true,
  },

  // セッション管理
  session: {
    maxAge: isDevelopment ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 開発: 30日, 本番: 7日
    refreshThreshold: isDevelopment ? 60 * 60 : 5 * 60, // 開発: 1時間, 本番: 5分
  },
};

/**
 * 環境に応じたSupabaseクライアントを作成
 */
export function createSecureSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  if (isDevelopment && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // 開発環境: Service Role Keyを使用（RLSバイパス）
    console.warn('⚠️ 開発環境: Service Role Keyを使用しています');
    return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } else {
    // 本番環境: Anon Keyを使用（RLS適用）
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured');
    }

    return createClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
}

/**
 * APIキーの検証（サーバーサイド専用）
 */
export async function validateApiKey(
  apiKey: string,
  supabase: SupabaseClient
): Promise<{ valid: boolean; userId?: string; tier?: string }> {
  try {
    // APIキーをハッシュ化
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // データベースで検証
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('user_id, tier, expires_at, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyData) {
      return { valid: false };
    }

    // 有効性チェック
    const now = new Date();
    const expiresAt = keyData.expires_at ? new Date(keyData.expires_at) : null;

    if (!keyData.is_active || (expiresAt && expiresAt < now)) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: keyData.user_id,
      tier: keyData.tier,
    };
  } catch (error) {
    console.error('APIキー検証エラー:', error);
    return { valid: false };
  }
}

/**
 * セキュリティヘッダーの設定
 */
export const securityHeaders = {
  'Content-Security-Policy': isDevelopment
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: ws: wss: data: blob:"
    : "default-src 'self' https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * セキュリティ監査ログ
 */
export async function logSecurityEvent(
  event: {
    type: string;
    userId?: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  },
  supabase: SupabaseClient
): Promise<void> {
  if (!securityConfig.monitoring.enabled) {
    return;
  }

  try {
    await supabase.from('security_alerts').insert({
      user_id: event.userId,
      alert_type: event.type,
      description: event.description,
      severity: event.severity,
    });
  } catch (error) {
    console.error('セキュリティイベントログエラー:', error);
  }
}

/**
 * レート制限チェック
 */
export async function checkRateLimit(
  apiKeyId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  if (!securityConfig.rateLimit.enabled) {
    return true;
  }

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_api_key_id: apiKeyId,
    p_limit: securityConfig.rateLimit.maxRequestsPerMinute,
  });

  if (error) {
    console.error('レート制限チェックエラー:', error);
    return false;
  }

  return data === true;
}