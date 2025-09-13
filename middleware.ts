import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 保護されたルート
const protectedRoutes = ['/dashboard', '/api/dashboard']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 開発環境用：一時的に認証をスキップ
  // TODO: 本番環境ではSupabase認証を有効化
  
  // 保護されたルートかチェック
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // 開発中は全てのリクエストを通す
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