import { NextRequest, NextResponse } from 'next/server'

// メモリベースのレート制限トラッキング（本番環境ではRedisを推奨）
const requestCounts = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number  // 時間ウィンドウ（ミリ秒）
  maxRequests: number  // 最大リクエスト数
  skipFailedRequests?: boolean  // 失敗したリクエストをカウントしない
  keyGenerator?: (req: NextRequest) => string  // キー生成関数
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1分
  maxRequests: 100,  // 1分あたり100リクエスト
  skipFailedRequests: false,
  keyGenerator: (req: NextRequest) => {
    // デフォルトはIPアドレスベース
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    return ip
  }
}

/**
 * レート制限を実装するミドルウェア
 * @param config レート制限の設定
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }

  return async function rateLimitMiddleware(req: NextRequest) {
    const key = finalConfig.keyGenerator!(req)
    const now = Date.now()

    // 既存のエントリを取得または新規作成
    let entry = requestCounts.get(key)

    if (!entry || now > entry.resetTime) {
      // 新しいウィンドウを開始
      entry = {
        count: 1,
        resetTime: now + finalConfig.windowMs
      }
      requestCounts.set(key, entry)

      // 古いエントリをクリーンアップ（メモリリーク防止）
      for (const [k, v] of requestCounts.entries()) {
        if (now > v.resetTime) {
          requestCounts.delete(k)
        }
      }
    } else if (entry.count >= finalConfig.maxRequests) {
      // レート制限に達した
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(finalConfig.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            'Retry-After': String(retryAfter)
          }
        }
      )
    } else {
      // リクエストをカウント
      entry.count++
    }

    // レート制限情報をレスポンスヘッダーに追加
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(finalConfig.maxRequests))
    response.headers.set('X-RateLimit-Remaining', String(finalConfig.maxRequests - entry.count))
    response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())

    return response
  }
}

/**
 * APIキーベースのレート制限
 */
export function createApiKeyRateLimiter(config: Partial<RateLimitConfig> = {}) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req: NextRequest) => {
      // APIキーベースのレート制限
      const apiKey = req.headers.get('x-api-key') ||
                     req.headers.get('authorization')?.replace('Bearer ', '') ||
                     'unknown'
      return `api:${apiKey}`
    }
  })
}

/**
 * エンドポイント別レート制限
 */
export function createEndpointRateLimiter(
  endpoint: string,
  config: Partial<RateLimitConfig> = {}
) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req: NextRequest) => {
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
      return `${endpoint}:${ip}`
    }
  })
}

/**
 * ティア別レート制限設定
 */
export const tierLimits = {
  free: {
    windowMs: 60 * 1000,  // 1分
    maxRequests: 10  // 1分あたり10リクエスト
  },
  basic: {
    windowMs: 60 * 1000,  // 1分
    maxRequests: 100  // 1分あたり100リクエスト
  },
  premium: {
    windowMs: 60 * 1000,  // 1分
    maxRequests: 1000  // 1分あたり1000リクエスト
  }
}

/**
 * メモリストアをクリア（テスト用）
 */
export function clearRateLimitStore() {
  requestCounts.clear()
}