import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 保護されたルート（認証が必要）
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/settings',
  '/api/dashboard',
  '/api/api-keys',
  '/api/subscription',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🔒 セキュリティ: 重複Cookie検知
  // 同名のSupabase auth cookieが複数存在する場合、セッション混在の可能性があるため強制クリア
  const cookieHeader = request.headers.get('cookie') || '';
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

  if (projectRef) {
    const authTokenPattern = new RegExp(`sb-${projectRef}-auth-token(?:\\.\\d+)?=`, 'g');
    const matches = cookieHeader.match(authTokenPattern) || [];

    // 重複検知: 同じプレフィックスのauth-tokenが複数ある場合
    if (matches.length > 3) { // .0, .1, verifier の3つが正常
      console.error('🚨 Security: Duplicate session cookies detected. Forcing logout.');

      // すべてのSupabase cookieをクリア
      const response = NextResponse.redirect(new URL('/login?error=session-conflict', request.url));

      // 既存のcookieを網羅的に削除
      for (let i = 0; i < 10; i++) {
        response.cookies.set(`sb-${projectRef}-auth-token.${i}`, '', {
          path: '/',
          expires: new Date(0),
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
      }
      response.cookies.set(`sb-${projectRef}-auth-token-code-verifier`, '', {
        path: '/',
        expires: new Date(0),
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });

      return response;
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Supabaseクライアントを作成
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
    }
  )

  // セッションを取得
  const { data: { session } } = await supabase.auth.getSession()

  // パスが保護されているかチェック
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  // 保護されたパスで認証がない場合
  if (isProtectedPath && !session) {
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
  if (session && (pathname === '/login' || pathname === '/auth/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // 静的ファイル以外のすべてのルートでmiddlewareを実行
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
