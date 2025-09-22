import { NextRequest, NextResponse } from 'next/server'
import { createRateLimiter, createApiKeyRateLimiter } from '@/lib/security/rate-limiter'

// グローバルレート制限（IPベース）
const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1分
  maxRequests: 200  // 1分あたり200リクエスト
})

// APIキーベースのレート制限
const apiKeyRateLimiter = createApiKeyRateLimiter({
  windowMs: 60 * 1000,  // 1分
  maxRequests: 100  // 1分あたり100リクエスト（デフォルト）
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // APIルートのみレート制限を適用
  if (pathname.startsWith('/api/')) {
    // APIキーが存在する場合はAPIキーベース、そうでなければIPベース
    const hasApiKey = request.headers.has('x-api-key') ||
                      request.headers.has('authorization')

    const rateLimiter = hasApiKey ? apiKeyRateLimiter : globalRateLimiter
    const rateLimitResponse = await rateLimiter(request)

    // レート制限に引っかかった場合
    if (rateLimitResponse.status === 429) {
      return rateLimitResponse
    }

    // セキュリティヘッダーを追加
    const response = NextResponse.next()

    // セキュリティヘッダー
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    )

    // レート制限情報をコピー
    const rateLimitHeaders = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    rateLimitHeaders.forEach(header => {
      const value = rateLimitResponse.headers.get(header)
      if (value) {
        response.headers.set(header, value)
      }
    })

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}