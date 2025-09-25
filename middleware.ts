import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

  // Supabaseクライアントを作成
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  )

  // セッションチェック
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('❌ Middleware: Session check error:', error)
  }

  // セッションがない場合はログインページへリダイレクト
  if (!session) {
    console.log(`❌ Middleware: No session for ${pathname}, redirecting to login`)

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

  console.log(`✅ Middleware: Authenticated user ${session.user.email} accessing ${pathname}`)

  // 認証済みの場合はリクエストを通す
  // バックフォワードキャッシュを有効にするため、Cache-Controlを調整
  response.headers.set('Cache-Control', 'private, no-cache, must-revalidate')
  response.headers.set('Vary', 'Cookie')
  return response
}

export const config = {
  matcher: [
    // 保護されたルートのみマッチ
    // '/dashboard/:path*',  // (protected)レイアウトで保護するためコメントアウト
    '/profile/:path*',
    '/settings/:path*',
    '/api/dashboard/:path*',
    '/api/api-keys/:path*',
  ],
}