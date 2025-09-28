import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 保護されたルートのリスト
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/api/dashboard',
  '/api/api-keys',
]

// 認証が不要なルート
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

  // 静的ファイルとAPIヘルスチェックはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next()
  }

  // パスが保護されているかチェック
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))

  // 公開ルートの場合はそのまま通す
  if (!isProtectedRoute || isPublicRoute) {
    return NextResponse.next()
  }

  console.log(`🔐 Middleware: Checking auth for ${pathname}`)

  // Edge Runtime互換: クッキーから直接セッショントークンを確認
  // Supabaseのセッショントークンはsb-<project-ref>-auth-tokenという名前で保存される
  // Edge Runtimeではprocess.envが使えるが、念のため直接環境変数を参照
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

  if (!projectRef) {
    console.error('❌ Middleware: Invalid Supabase URL configuration')
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

  // Supabaseのauth cookieを確認
  const authTokenName = `sb-${projectRef}-auth-token`
  const authToken = request.cookies.get(authTokenName)?.value

  // セッショントークンがない場合はログインページへリダイレクト
  if (!authToken) {
    console.log(`❌ Middleware: No auth token for ${pathname}, redirecting to login`)

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

  // Edge Runtimeでは完全なセッション検証はできないため、
  // auth tokenの存在のみをチェック
  // 実際のセッション検証は各ルートハンドラーで行う
  console.log(`✅ Middleware: Auth token found for ${pathname}`)

  const response = NextResponse.next()

  // バックフォワードキャッシュを有効にするため、Cache-Controlを調整
  response.headers.set('Cache-Control', 'private, no-cache, must-revalidate')
  response.headers.set('Vary', 'Cookie')

  return response
}

export const config = {
  matcher: [
    // 保護されたルートを有効化
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/api/dashboard/:path*',
    '/api/api-keys/:path*',
  ],
}