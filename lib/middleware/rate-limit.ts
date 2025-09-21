import { NextRequest, NextResponse } from 'next/server';
import { supabaseManager } from '../infrastructure/supabase-manager';

// メモリベースのレート制限（本番環境ではRedis推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;  // 時間窓（ミリ秒）
  maxRequests: number; // 最大リクエスト数
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
 * レート制限チェック
 */
export async function checkRateLimit(
  request: NextRequest,
  apiKeyId: string,
  planType: string
): Promise<NextResponse | null> {
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
  
  // 制限チェック
  if (limitData.count > config.maxRequests) {
    // レート制限超過をログに記録
    await logRateLimitExceeded(apiKeyId, limitData.count, config.maxRequests);
    
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please retry after ${Math.ceil((limitData.resetTime - now) / 1000)} seconds`,
        limit: config.maxRequests,
        windowMs: config.windowMs,
        retryAfter: Math.ceil((limitData.resetTime - now) / 1000)
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, config.maxRequests - limitData.count).toString(),
          'X-RateLimit-Reset': new Date(limitData.resetTime).toISOString(),
          'Retry-After': Math.ceil((limitData.resetTime - now) / 1000).toString()
        }
      }
    );
  }
  
  // レート制限情報をヘッダーに追加
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - limitData.count).toString());
  response.headers.set('X-RateLimit-Reset', new Date(limitData.resetTime).toISOString());
  
  return null; // 制限内
}

/**
 * IP ベースのレート制限（認証なしエンドポイント用）
 */
export async function checkIpRateLimit(
  request: NextRequest,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000
): Promise<NextResponse | null> {
  const now = Date.now();
  
  // IPアドレス取得
  const ip = request.headers.get('x-forwarded-for') || 
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
  
  if (limitData.count > maxRequests) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP address',
        retryAfter: Math.ceil((limitData.resetTime - now) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((limitData.resetTime - now) / 1000).toString()
        }
      }
    );
  }
  
  return null;
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
    const supabase = supabaseManager.getServiceClient();
    await supabase.from('rate_limit_violations').insert({
      api_key_id: apiKeyId,
      attempted_requests: attemptedCount,
      limit_threshold: limit,
      violation_time: new Date().toISOString()
    });
  } catch (error) {
    // エラーをログに記録しない（機密情報保護）
  }
}

/**
 * クリーンアップ（古いエントリを削除）
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((data, key) => {
    if (now > data.resetTime) {
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

