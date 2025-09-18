import { NextRequest, NextResponse } from 'next/server';
import { supabaseManager } from '../infrastructure/supabase-manager';

// メモリベースのレート制限（本番環境ではRedis推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;  // 時間窓（ミリ秒）
  maxRequests: number; // 最大リクエスト数
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// プラン別レート制限設定
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 10
  },
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 60
  },
  pro: {
    windowMs: 60 * 1000,
    maxRequests: 300
  },
  enterprise: {
    windowMs: 60 * 1000,
    maxRequests: 1000
  }
};

/**
 * レート制限チェック - ヘッダー情報を返す
 */
export async function checkRateLimit(
  request: NextRequest,
  apiKeyId: string,
  planType: string
): Promise<{ exceeded: boolean; headers: Headers; info: RateLimitInfo }> {
  const now = Date.now();
  const config = RATE_LIMITS[planType] || RATE_LIMITS.free;

  // レート制限キー（APIキーごと）
  const key = `rate_limit:${apiKeyId}`;

  // 現在の使用状況を取得
  let limitData = rateLimitStore.get(key);

  // 初回またはリセット時間経過
  if (!limitData || now > limitData.resetTime) {
    limitData = {
      count: 0,
      resetTime: now + config.windowMs
    };
  }

  // リクエスト数をインクリメント
  limitData.count++;
  rateLimitStore.set(key, limitData);

  const remaining = Math.max(0, config.maxRequests - limitData.count);
  const resetTime = new Date(limitData.resetTime);
  const retryAfter = Math.ceil((limitData.resetTime - now) / 1000);

  // レート制限ヘッダーを作成
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', resetTime.toISOString());

  const info: RateLimitInfo = {
    limit: config.maxRequests,
    remaining,
    reset: resetTime
  };

  // 制限超過チェック
  if (limitData.count > config.maxRequests) {
    // レート制限超過をログに記録
    await logRateLimitExceeded(apiKeyId, limitData.count, config.maxRequests);

    headers.set('Retry-After', retryAfter.toString());
    info.retryAfter = retryAfter;

    return { exceeded: true, headers, info };
  }

  return { exceeded: false, headers, info };
}

/**
 * レート制限エラーレスポンスを作成
 */
export function createRateLimitErrorResponse(info: RateLimitInfo): NextResponse {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: `Too many requests. Please retry after ${info.retryAfter} seconds`,
      limit: info.limit,
      remaining: 0,
      reset: info.reset.toISOString(),
      retryAfter: info.retryAfter
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': info.reset.toISOString(),
        'Retry-After': info.retryAfter?.toString() || '60'
      }
    }
  );
}

/**
 * レスポンスにレート制限ヘッダーを追加
 */
export function applyRateLimitHeaders(response: NextResponse, headers: Headers): NextResponse {
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * IP ベースのレート制限（認証なしエンドポイント用）
 */
export async function checkIpRateLimit(
  request: NextRequest,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000
): Promise<{ exceeded: boolean; headers: Headers; info: RateLimitInfo }> {
  const now = Date.now();

  // IPアドレス取得
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const key = `ip_rate_limit:${ip}`;

  let limitData = rateLimitStore.get(key);

  if (!limitData || now > limitData.resetTime) {
    limitData = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  limitData.count++;
  rateLimitStore.set(key, limitData);

  const remaining = Math.max(0, maxRequests - limitData.count);
  const resetTime = new Date(limitData.resetTime);
  const retryAfter = Math.ceil((limitData.resetTime - now) / 1000);

  const headers = new Headers();
  headers.set('X-RateLimit-Limit', maxRequests.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', resetTime.toISOString());

  const info: RateLimitInfo = {
    limit: maxRequests,
    remaining,
    reset: resetTime
  };

  if (limitData.count > maxRequests) {
    headers.set('Retry-After', retryAfter.toString());
    info.retryAfter = retryAfter;
    return { exceeded: true, headers, info };
  }

  return { exceeded: false, headers, info };
}

/**
 * レート制限超過をログに記録
 */
async function logRateLimitExceeded(
  apiKeyId: string,
  attemptedCount: number,
  limit: number
) {
  try {
    await supabase.from('rate_limit_violations').insert({
      api_key_id: apiKeyId,
      attempted_requests: attemptedCount,
      limit_threshold: limit,
      violation_time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log rate limit violation:', error);
  }
}

/**
 * クリーンアップ（古いエントリを削除）
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  const keysToDelete: string[] = [];

  rateLimitStore.forEach((data, key) => {
    if (now > data.resetTime + 60000) { // 1分間の猶予
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => {
    rateLimitStore.delete(key);
  });
}

// 定期的にクリーンアップ（5分ごと）
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

export { RATE_LIMITS };