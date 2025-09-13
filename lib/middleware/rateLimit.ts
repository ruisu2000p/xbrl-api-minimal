import { NextRequest } from 'next/server';

// メモリベースのレート制限（本番環境ではRedis推奨）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const userLimit = requestCounts.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    // 新しいウィンドウを開始
    const resetTime = now + windowMs;
    requestCounts.set(identifier, { count: 1, resetTime });
    
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime
    };
  }

  if (userLimit.count >= limit) {
    // レート制限を超過
    return {
      success: false,
      limit,
      remaining: 0,
      reset: userLimit.resetTime
    };
  }

  // カウントを増加
  userLimit.count++;
  requestCounts.set(identifier, userLimit);

  return {
    success: true,
    limit,
    remaining: limit - userLimit.count,
    reset: userLimit.resetTime
  };
}

// 定期的に古いエントリをクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime + 60000) {
      requestCounts.delete(key);
    }
  }
}, 60000);