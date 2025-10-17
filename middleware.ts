import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { issueCsrfCookie } from '@/utils/security/csrf'

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

  // 🔒 セキュリティ: CSRF トークン検証（POST/PUT/PATCH/DELETE のみ）
  // 認証不要のパスや特定のパスは除外
  const csrfExemptPaths = [
    '/api/auth/callback',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/webhooks'
  ];

  const requiresCsrfCheck =
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    pathname.startsWith('/api/') &&
    !csrfExemptPaths.some(exemptPath => pathname.startsWith(exemptPath));

  if (requiresCsrfCheck) {
    const headerToken = request.headers.get('x-csrf-token');
    const cookieToken = request.cookies.get('csrf-token')?.value;

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      console.error('🚨 Security: CSRF token validation failed', {
        path: pathname,
        hasHeader: !!headerToken,
        hasCookie: !!cookieToken,
        tokensMatch: headerToken === cookieToken
      });
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
  }

  // 🔒 セキュリティ: Origin/Refererチェック（CSRF対策の補助層）
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // APIリクエストの場合、originが許可されたものであることを確認
    if (pathname.startsWith('/api/')) {
      if (origin && origin !== new URL(allowedOrigin).origin) {
        console.error('🚨 Security: Invalid origin detected', { origin, expected: allowedOrigin });
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        );
      }
      // Originヘッダーがない場合はRefererで補完チェック
      if (!origin && referer && !referer.startsWith(allowedOrigin)) {
        console.error('🚨 Security: Invalid referer detected', { referer, expected: allowedOrigin });
        return NextResponse.json(
          { error: 'Invalid referer' },
          { status: 403 }
        );
      }
    }
  }

  // 🔒 セキュリティ: 重複Cookie検知
  // .0 と .1 が各1個ずつであることを確認（code-verifierは一時的なので除外）
  const cookieHeader = request.headers.get('cookie') || '';
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

  if (projectRef) {
    // .0 と .1 の個別カウント（生のCookieヘッダから正規表現で）
    const pattern0 = new RegExp(`(?:^|;\\s*)sb-${projectRef}-auth-token\\.0=`, 'g');
    const pattern1 = new RegExp(`(?:^|;\\s*)sb-${projectRef}-auth-token\\.1=`, 'g');
    const count0 = (cookieHeader.match(pattern0) || []).length;
    const count1 = (cookieHeader.match(pattern1) || []).length;

    // 重複検知: .0 または .1 が2個以上ある = セッション混在
    const hasDuplicate = count0 !== 1 || count1 !== 1;

    if (hasDuplicate) {
      console.error('🚨 Security: Duplicate session cookies detected.', {
        'auth-token.0': count0,
        'auth-token.1': count1
      });

      // すべてのSupabase cookieを強制クリア
      const response = NextResponse.redirect(new URL('/login?error=session-conflict', request.url));

      // Domain あり/なし両対応で網羅的に削除
      const domains = [undefined, `.${new URL(request.url).hostname}`];
      for (let i = 0; i < 10; i++) {
        for (const domain of domains) {
          response.cookies.set(`sb-${projectRef}-auth-token.${i}`, '', {
            path: '/',
            ...(domain ? { domain } : {}),
            expires: new Date(0),
            httpOnly: true,
            secure: true,
            sameSite: 'lax'
          });
        }
      }
      // code-verifier も削除
      for (const domain of domains) {
        response.cookies.set(`sb-${projectRef}-auth-token-code-verifier`, '', {
          path: '/',
          ...(domain ? { domain } : {}),
          expires: new Date(0),
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
      }

      // 念のため Clear-Site-Data も送信（オプション）
      response.headers.set('Cache-Control', 'no-store');
      // response.headers.set('Clear-Site-Data', '"cookies"'); // 必要に応じて有効化

      return response;
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Supabaseクライアントを作成
  // 🔒 重要: request と response 両方に Cookie を反映（SSR でのズレ防止）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Path=/に統一、必要に応じてDomainも統一
          const cookieOptions = {
            ...options,
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax' as const
          };

          // request と response 両方に設定
          request.cookies.set({ name, value, ...cookieOptions });
          response.cookies.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: any) {
          const cookieOptions = {
            ...options,
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax' as const,
            maxAge: 0,
            expires: new Date(0)
          };

          // request と response 両方から削除
          request.cookies.set({ name, value: '', ...cookieOptions });
          response.cookies.set({ name, value: '', ...cookieOptions });
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

  // 🔒 セキュリティ: CSRF トークンを発行（Cookie に保存）
  // すべてのレスポンスに対して CSRF トークンを発行（まだない場合のみ）
  issueCsrfCookie(response);

  return response
}

export const config = {
  matcher: [
    // 静的ファイル以外のすべてのルートでmiddlewareを実行
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
