import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 認証が必要なルートのリスト
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/api/dashboard',
  '/api/api-keys',
]

// 認証不要なルート
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/callback',
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/sync',
  '/api/health',
  '/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 静的ファイルやAPIヘルスチェックはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next()
  }

  // パスが保護対象かチェック
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))

  // 公開ルートの場合はそのまま続行
  if (!isProtectedRoute || isPublicRoute) {
    return NextResponse.next()
  }

  console.log(`🔐 Middleware: Checking auth for ${pathname}`)

  // Supabaseのプロジェクト情報を解析
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

  if (!projectRef) {
    console.error('⚠️ Middleware: Invalid Supabase URL configuration')
    return new NextResponse(
      JSON.stringify({
        error: 'Configuration error',
        message: 'Service configuration is incomplete'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }

  // Supabase標準のauth cookie名
  const authTokenName = `sb-${projectRef}-auth-token`
  const hasAuthCookie = request.cookies.has(authTokenName)
  const hasTokenPair = request.cookies.has('sb-access-token') && request.cookies.has('sb-refresh-token')

  // セッショントークンが存在しない場合はログインページへリダイレクト
  if (!hasAuthCookie && !hasTokenPair) {
    console.log(`🚫 Middleware: No auth cookie or token pair for ${pathname}, redirecting to login`)

    // APIルートの場合は401を返す
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // ページの場合はログインページへリダイレクト
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  const authContext = hasAuthCookie ? 'auth cookie' : 'token pair'

  // Edge Runtimeでは完全なセッション検証は不可のため、トークンの存在のみをチェック
  // 実際のセッション検証は各ルートハンドラーで実施
  console.log(`✅ Middleware: ${authContext} found for ${pathname}`)

  const response = NextResponse.next()

  // バックフォワードキャッシュ無効化・Cookie変更を反映
  response.headers.set('Cache-Control', 'private, no-cache, must-revalidate')
  response.headers.set('Vary', 'Cookie')

  return response
}

export const config = {
  matcher: [
    // 認証が必要なルートを列挙
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/api/dashboard/:path*',
    '/api/api-keys/:path*',
  ],
}
