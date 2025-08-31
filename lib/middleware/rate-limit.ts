import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// メモリベースのレート制限（本番環境ではRedis推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

/**
 * 分散レート制限（組織全体）
 */
export async function checkOrganizationRateLimit(
  organizationId: string,
  planType: string
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const config = RATE_LIMITS[planType] || RATE_LIMITS.free;
  const now = Date.now();
  const key = `org_rate_limit:${organizationId}`;
  
  let limitData = rateLimitStore.get(key);
  
  if (!limitData || now > limitData.resetTime) {
    limitData = {
      count: 0,
      resetTime: now + config.windowMs
    };
  }
  
  limitData.count++;
  rateLimitStore.set(key, limitData);
  
  return {
    allowed: limitData.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - limitData.count),
    resetTime: new Date(limitData.resetTime)
  };
}

/**
 * 適応的レート制限（負荷に応じて動的に調整）
 */
export class AdaptiveRateLimiter {
  private loadFactor: number = 1.0;
  private lastCheck: number = Date.now();
  private requestCounts: number[] = [];
  
  updateLoadFactor(responseTime: number) {
    // レスポンス時間に基づいて負荷係数を調整
    if (responseTime > 1000) {
      this.loadFactor = Math.max(0.5, this.loadFactor - 0.1);
    } else if (responseTime < 200) {
      this.loadFactor = Math.min(1.5, this.loadFactor + 0.05);
    }
  }
  
  getAdjustedLimit(baseLimit: number): number {
    return Math.floor(baseLimit * this.loadFactor);
  }
  
  recordRequest() {
    const now = Date.now();
    // 1分間のウィンドウで記録
    this.requestCounts = this.requestCounts.filter(t => now - t < 60000);
    this.requestCounts.push(now);
  }
  
  getCurrentLoad(): number {
    return this.requestCounts.length;
  }
}

export const adaptiveRateLimiter = new AdaptiveRateLimiter();