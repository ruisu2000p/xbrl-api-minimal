import { NextRequest } from 'next/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RequestEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blocked: boolean;
}

class RateLimiter {
  private store: Map<string, RequestEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests || 100,
      windowMs: config.windowMs || 60000,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
    };

    // 定期的に古いエントリを削除
    setInterval(() => this.cleanup(), this.config.windowMs);
  }

  private defaultKeyGenerator(req: NextRequest): string {
    // IP アドレスベースの識別
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // APIキーがある場合はそれも含める
    const apiKey = req.headers.get('x-api-key');
    const identifier = apiKey ? `${ip}-${apiKey.substring(0, 8)}` : ip;

    return identifier;
  }

  async checkLimit(req: NextRequest): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: Date;
    retryAfter?: number;
  }> {
    const key = this.config.keyGenerator!(req);
    const now = Date.now();
    const entry = this.store.get(key);

    // エントリがない場合は新規作成
    if (!entry) {
      this.store.set(key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
      });

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        reset: new Date(now + this.config.windowMs),
      };
    }

    // ウィンドウが過ぎている場合はリセット
    if (now - entry.firstRequest > this.config.windowMs) {
      entry.count = 1;
      entry.firstRequest = now;
      entry.lastRequest = now;
      entry.blocked = false;

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        reset: new Date(now + this.config.windowMs),
      };
    }

    // 制限に達している場合
    if (entry.count >= this.config.maxRequests) {
      entry.blocked = true;
      const resetTime = entry.firstRequest + this.config.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        reset: new Date(resetTime),
        retryAfter,
      };
    }

    // カウントを増やして許可
    entry.count++;
    entry.lastRequest = now;

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.count,
      reset: new Date(entry.firstRequest + this.config.windowMs),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.store.forEach((entry, key) => {
      if (now - entry.firstRequest > this.config.windowMs * 2) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.store.delete(key));
  }

  // 統計情報を取得
  getStats(): {
    activeKeys: number;
    blockedKeys: number;
    totalRequests: number;
  } {
    let blockedKeys = 0;
    let totalRequests = 0;

    this.store.forEach(entry => {
      if (entry.blocked) blockedKeys++;
      totalRequests += entry.count;
    });

    return {
      activeKeys: this.store.size,
      blockedKeys,
      totalRequests,
    };
  }

  // 特定のキーをリセット
  resetKey(key: string): boolean {
    return this.store.delete(key);
  }

  // すべてのキーをリセット
  resetAll(): void {
    this.store.clear();
  }
}

// 異なるエンドポイント用のレートリミッター
export const apiRateLimiter = new RateLimiter({
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15分
});

export const searchRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60000, // 1分
});

// DDoS対策用の厳格なレートリミッター
export const strictRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 10000, // 10秒
});

export default RateLimiter;