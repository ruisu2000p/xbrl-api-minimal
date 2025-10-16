import { NextRequest, NextResponse } from 'next/server';

/**
 * Supabase 認証 Cookie をカノニカル属性で request/response 両方に同期
 *
 * SSR で「ブラウザは新Cookie、サーバーは旧Cookie」のズレを防ぐため、
 * @supabase/ssr の推奨に従い、getUser() 後の Cookie 更新を両方に反映
 *
 * @param request NextRequest object
 * @param response NextResponse object
 * @param projectRef Supabase project reference (e.g., "wpwqxhyiglbtlaimrjrx")
 * @param domain Optional: Cookie domain (e.g., ".example.com")
 *
 * @example
 * const supabase = await createServerSupabaseClient();
 * await supabase.auth.getUser(); // Cookie が更新される可能性がある
 * syncAllAuthCookies(request, response, projectRef, domain);
 */
export function syncAllAuthCookies(
  request: NextRequest,
  response: NextResponse,
  projectRef: string,
  domain?: string
): void {
  // Supabase 認証 Cookie 名のリスト
  const cookieNames = [
    `sb-${projectRef}-auth-token.0`,
    `sb-${projectRef}-auth-token.1`,
    `sb-${projectRef}-auth-token-code-verifier`,
  ];

  for (const name of cookieNames) {
    const value = request.cookies.get(name)?.value;

    if (!value) {
      continue; // Cookie が存在しない場合はスキップ
    }

    // カノニカル属性（Path=/, Domain統一, セキュリティフラグ）
    const cookieOptions = {
      name,
      value,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      ...(domain ? { domain } : {})
    };

    // request と response 両方に設定（SSR でのズレ防止）
    request.cookies.set(cookieOptions);
    response.cookies.set(cookieOptions);
  }
}

/**
 * すべての Supabase 認証 Cookie を削除（ログアウト時）
 *
 * Domain あり/なし両対応で、Path=/ のすべての Cookie を削除
 *
 * @param response NextResponse object
 * @param projectRef Supabase project reference
 * @param domains Cookie domains to clear (e.g., [undefined, ".example.com"])
 *
 * @example
 * clearAllAuthCookies(response, projectRef, [undefined, ".example.com"]);
 */
export function clearAllAuthCookies(
  response: NextResponse,
  projectRef: string,
  domains: (string | undefined)[] = [undefined]
): void {
  // .0 〜 .9 + code-verifier を削除
  for (let i = 0; i < 10; i++) {
    for (const domain of domains) {
      response.cookies.set(`sb-${projectRef}-auth-token.${i}`, '', {
        path: '/',
        ...(domain ? { domain } : {}),
        expires: new Date(0),
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }
}
