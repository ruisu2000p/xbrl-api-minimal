/**
 * APIキー認証ミドルウェア
 * Bearerトークンとして送られたAPIキーを検証
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin, type ApiKey } from './supabaseAdmin';
import { hashApiKey, validateApiKeyFormat, isKeyExpired } from './apiKey';

export interface AuthResult {
  ok: true;
  key: ApiKey;
  userId: string;
}

export interface AuthError {
  ok: false;
  error: string;
  status: number;
}

/**
 * APIキーによる認証
 * @param req NextRequest オブジェクト
 * @returns 認証結果
 */
export async function authByApiKey(req: NextRequest): Promise<AuthResult | AuthError> {
  try {
    // Authorizationヘッダーを取得
    const authHeader = req.headers.get('authorization') || '';
    
    // Bearer形式のチェック
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!bearerMatch) {
      return {
        ok: false,
        error: 'Missing or invalid Authorization header. Use: Bearer YOUR_API_KEY',
        status: 401,
      };
    }

    const apiKey = bearerMatch[1].trim();

    // APIキーフォーマットの検証
    if (!validateApiKeyFormat(apiKey)) {
      return {
        ok: false,
        error: 'Invalid API key format',
        status: 401,
      };
    }

    // APIキーをハッシュ化
    const keyHash = hashApiKey(apiKey);

    // データベースでAPIキーを検索（現在のテーブル構造に対応）
    const { data, error } = await admin
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return {
        ok: false,
        error: 'Authentication failed',
        status: 500,
      };
    }

    if (!data) {
      return {
        ok: false,
        error: 'Invalid API key',
        status: 401,
      };
    }

    // キーがアクティブかチェック（revoked または is_active）
    if (data.revoked || data.is_active === false) {
      return {
        ok: false,
        error: 'API key has been revoked',
        status: 401,
      };
    }

    // ステータスチェック
    if (data.status && data.status !== 'active') {
      return {
        ok: false,
        error: `API key status: ${data.status}`,
        status: 401,
      };
    }

    // 有効期限チェック
    if (isKeyExpired(data.expires_at)) {
      return {
        ok: false,
        error: 'API key has expired',
        status: 401,
      };
    }

    // 最終使用時刻を非同期で更新（レスポンスを待たない）
    admin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {
        // 成功時は何もしない
      })
      .catch((err) => {
        console.error('Failed to update last_used_at:', err);
      });

    return {
      ok: true,
      key: data as ApiKey,
      userId: data.user_id,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      ok: false,
      error: 'Authentication failed',
      status: 500,
    };
  }
}

/**
 * レート制限チェック
 * @param apiKeyId APIキーのID
 * @param limitPerMinute 1分あたりの制限（デフォルト: 60）
 */
export async function checkRateLimit(
  apiKeyId: string,
  limitPerMinute: number = 60
): Promise<boolean> {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    
    const { count, error } = await admin
      .from('api_access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', apiKeyId)
      .gte('created_at', oneMinuteAgo);

    if (error) {
      console.error('Rate limit check error:', error);
      return true; // エラー時は通す（サービス継続性優先）
    }

    return (count || 0) < limitPerMinute;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true;
  }
}

/**
 * API使用ログを記録
 */
export async function recordApiUsage(
  apiKeyId: string,
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await admin.from('api_access_logs').insert({
      api_key_id: apiKeyId,
      user_id: userId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Failed to record API usage:', error);
    // ログ記録の失敗はAPIレスポンスに影響させない
  }
}

/**
 * IP アドレスを取得
 */
export function getClientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') || // Cloudflare
    undefined
  );
}