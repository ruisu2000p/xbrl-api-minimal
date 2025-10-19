import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { issueCsrfCookie } from '@/utils/security/csrf'
import { logSecurityEvent } from '@/utils/security/audit-log'
import { sweepSbAuthCookies } from '@/utils/security/cookies'

// 公開パス（認証不要、OAuth、静的リソース含む）
const PUBLIC_PATHS: RegExp[] = [
  /^\/$/,
  /^\/login$/,
  /^\/signup$/,
  /^\/verify-email$/,         // メール確認ページ
  /^\/email-trouble$/,        // メール配信問題ページ
  /^\/forgot-password$/,      // パスワードリセットリクエストページ
  /^\/reset-password$/,       // パスワードリセットページ（PKCEコード交換のため）
  /^\/auth(\/|$)/,            // OAuth callback 含む
  /^\/api\/auth(\/|$)/,       // 認証 API
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/_next\//,
  /\.(?:svg|png|jpg|jpeg|gif|ico|webp|css|js)$/,
]

const isPublicPath = (pathname: string) => PUBLIC_PATHS.some(rx => rx.test(pathname))

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
  const method = request.method

  // OPTIONS / 公開ルート / 静的リソースは素通り（OAuth フロー保護）
  if (method === 'OPTIONS' || isPublicPath(pathname)) {
    const pass = NextResponse.next()
    pass.headers.set('Cache-Control', 'no-store')
    pass.headers.set('Vary', 'Cookie, Authorization')
    return pass
  }

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

  // 許可されたオリジンのリスト（本番URL + ローカル環境）
  const allowedOrigins = [
    allowedOrigin,
    'https://fininfonext.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ];

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // APIリクエストの場合、originが許可されたものであることを確認
    if (pathname.startsWith('/api/')) {
      if (origin && !allowedOrigins.some(allowed => origin === new URL(allowed).origin)) {
        console.error('🚨 Security: Invalid origin detected', { origin, expected: allowedOrigins });
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        );
      }
      // Originヘッダーがない場合はRefererで補完チェック
      if (!origin && referer && !allowedOrigins.some(allowed => referer.startsWith(allowed))) {
        console.error('🚨 Security: Invalid referer detected', { referer, expected: allowedOrigins });
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

    // 重複検知: Cookie が存在する場合のみチェック
    // .0 または .1 が2個以上ある = セッション混在
    const hasCookies = count0 > 0 || count1 > 0;
    const hasDuplicate = hasCookies && (count0 !== 1 || count1 !== 1);

    if (hasDuplicate) {
      console.error('🚨 Security: Duplicate session cookies detected.', {
        'auth-token.0': count0,
        'auth-token.1': count1,
        path: pathname
      });

      // 🔒 セキュリティ: Cookie 重複を監査ログに記録
      await logSecurityEvent({
        type: 'cookie_conflict',
        outcome: 'fail',
        ip: request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        ua: request.headers.get('user-agent'),
        details: { path: pathname, count0, count1 }
      });

      const isApi = pathname.startsWith('/api/');
      const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
      const domains = [undefined, cookieDomain].filter(Boolean) as (string | undefined)[];

      // API リクエストは 401 JSON レスポンス（リダイレクトループ防止）
      if (isApi) {
        const response = NextResponse.json(
          { error: 'Session conflict. Please sign in again.' },
          { status: 401 }
        );
        sweepSbAuthCookies(response, projectRef, domains);
        response.headers.set('Cache-Control', 'no-store');
        response.headers.set('Vary', 'Cookie, Authorization');
        return response;
      }

      // ページリクエストは /login へリダイレクト + Cookie 全面掃除
      const response = NextResponse.redirect(new URL('/login?reason=session_conflict', request.url));
      sweepSbAuthCookies(response, projectRef, domains);
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('Vary', 'Cookie, Authorization');
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

  // 🔒 セキュリティ: メール未確認ユーザーの制限
  // 認証済みだがメールアドレスが未確認のユーザーを /verify-email にリダイレクト
  if (session && isProtectedPath) {
    const { data: { user } } = await supabase.auth.getUser()

    // メール確認が必要なのに未確認の場合
    if (user && !user.email_confirmed_at && pathname !== '/verify-email') {
      // APIルートの場合は403を返す
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({
            error: 'Email verification required',
            message: 'Please verify your email address before accessing this resource'
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      }

      // ページの場合は /verify-email へリダイレクト
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    // 🔒 セキュリティ: バウンス/苦情メールアドレスの制限
    // メール確認済みでも、email_status が bounced/complained の場合は制限
    if (user && user.email_confirmed_at && pathname !== '/email-trouble') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_status')
        .eq('id', user.id)
        .single()

      if (profile && (profile.email_status === 'bounced' || profile.email_status === 'complained')) {
        // APIルートの場合は403を返す
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({
              error: 'Email delivery issue',
              message: 'Your email address has delivery issues. Please update your email address.'
            }),
            {
              status: 403,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )
        }

        // ページの場合は /email-trouble へリダイレクト
        return NextResponse.redirect(new URL('/email-trouble', request.url))
      }
    }
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
