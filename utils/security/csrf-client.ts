/**
 * クライアント側のCSRFトークン管理ユーティリティ
 *
 * Double Submit Cookie パターンに基づき、最新のCSRFトークンを
 * 確実に取得するヘルパー関数を提供します。
 */

/**
 * 最新のCSRFトークンを取得
 *
 * 1. まずCookieから取得を試みる
 * 2. Cookieにない、または期限切れの場合は /api/csrf から最新を取得
 *
 * @returns CSRFトークン文字列
 * @throws Error CSRFトークンの取得に失敗した場合
 *
 * @example
 * const token = await getFreshCsrfToken();
 * fetch('/api/protected', {
 *   method: 'POST',
 *   headers: { 'X-CSRF-Token': token }
 * });
 */
export async function getFreshCsrfToken(): Promise<string> {
  // まずCookieから取得
  const fromCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];

  if (fromCookie) {
    return fromCookie;
  }

  // フォールバック: /api/csrf から最新のトークンを取得
  console.log('🔄 CSRF token not found in cookie, fetching fresh token...');

  try {
    const response = await fetch('/api/csrf', { credentials: 'include' });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const { csrfToken } = await response.json();

    if (!csrfToken) {
      throw new Error('CSRF token not returned from /api/csrf');
    }

    console.log('✅ Fresh CSRF token obtained');
    return csrfToken;
  } catch (error) {
    console.error('❌ Failed to get CSRF token:', error);
    throw new Error('セキュリティトークンの取得に失敗しました。ページを再読み込みしてください。');
  }
}

/**
 * CSRF保護されたAPIをリトライ機能付きで呼び出す
 *
 * 403エラーの場合、一度だけCSRFトークンを再取得してリトライします。
 *
 * @param url - API endpoint
 * @param options - fetch options (method, body, headers など)
 * @returns Response
 *
 * @example
 * const response = await fetchWithCsrf('/api/subscription/change', {
 *   method: 'POST',
 *   body: JSON.stringify({ action: 'downgrade', planType: 'freemium' })
 * });
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 最新のCSRFトークンを取得
  let csrfToken = await getFreshCsrfToken();

  // リクエストを実行
  let response = await fetch(url, {
    ...options,
    credentials: 'include', // 必須: Cookieを送信
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...options.headers,
    },
  });

  // 403の場合、一度だけリトライ
  if (response.status === 403) {
    console.log('⚠️ 403 Forbidden - Retrying with fresh CSRF token...');

    // 最新のトークンを再取得
    csrfToken = await getFreshCsrfToken();

    // 再度リクエスト
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...options.headers,
      },
    });

    if (response.ok) {
      console.log('✅ Retry succeeded');
    } else {
      console.error('❌ Retry failed:', response.status);
    }
  }

  return response;
}
