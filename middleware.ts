import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 保護されたルート
const protectedRoutes = ['/dashboard', '/api/dashboard']
// 認証済みユーザーがアクセスできないルート
const authRoutes = ['/auth/login', '/auth/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  // Cookieからセッショントークンを確認
  const token = request.cookies.get('supabase-auth-token')

  // 保護されたルートへのアクセス
  if (isProtectedRoute && !token) {
    // 未認証の場合はログインページへリダイレクト
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // 認証済みユーザーの認証ページへのアクセス
  if (isAuthRoute && token) {
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