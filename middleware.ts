import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 保護されたルート（dashboard-testは除外）
const protectedRoutes = ['/dashboard', '/api/dashboard'].filter(route => !route.includes('test'))
// 認証済みユーザーがアクセスできないルート
const authRoutes = ['/auth/login', '/auth/register']
// 認証不要のルート
const publicRoutes = ['/dashboard-test', '/api/apikeys/generate']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公開ルートは認証チェックをスキップ
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // 保護されたルートかチェック
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // APIルートは認証チェックをスキップ（APIキー認証を使用）
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 開発環境では認証チェックをスキップするオプション
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    return NextResponse.next()
  }

  // Supabase認証トークンを確認（複数の可能なCookie名をチェック）
  const authToken = request.cookies.get('sb-access-token') || 
                   request.cookies.get('sb-auth-token') ||
                   request.cookies.get('supabase-auth-token') ||
                   request.cookies.get('sb-zxzyidqrvzfzhicfuhlo-auth-token') // Supabase project-specific token

  // デバッグ情報は本番環境では出力しない

  // 保護されたルートへのアクセス
  if (isProtectedRoute && !authToken) {
    // 未認証の場合はログインページへリダイレクト
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // 認証済みユーザーの認証ページへのアクセス
  if (isAuthRoute && authToken) {
    // 既にログイン済みの場合はダッシュボードへリダイレクト
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// ミドルウェアを適用するパス
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}