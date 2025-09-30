import { type NextRequest, NextResponse } from 'next/server'

// 保護されたルート（認証が必要）
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/settings',
  '/api/dashboard',
  '/api/api-keys',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabaseプロジェクトの識別子を取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]

  if (!projectRef) {
    return NextResponse.next()
  }

  // Cookieの存在をチェック（簡易的な認証チェック）
  const sessionCookie = request.cookies.get(`sb-${projectRef}-auth-token`)

  // パスが保護されているかチェック
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  // 保護されたパスで認証Cookieがない場合
  if (isProtectedPath && !sessionCookie) {
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
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ログインページにアクセスした認証済みユーザーをダッシュボードにリダイレクト
  if (sessionCookie && (pathname === '/login' || pathname === '/auth/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 静的ファイル以外のすべてのルートでmiddlewareを実行
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
