/**
 * クライアント側 CSRF トークン処理ユーティリティ
 *
 * Cookie から CSRF トークンを読み取り、fetch リクエストに自動追加
 */

/**
 * Cookie から指定した名前の値を取得
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }

  return null;
}

/**
 * CSRF トークンを自動的に追加する fetch ラッパー
 *
 * POST/PUT/PATCH/DELETE リクエストに対して、Cookie の csrf-token を
 * X-CSRF-Token ヘッダーに自動追加します。
 *
 * @example
 * // 通常の fetch の代わりに使用
 * const response = await secureFetch('/api/subscription/cancel', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ reason: 'test' })
 * });
 */
export async function secureFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const csrfToken = getCookie('csrf-token');

  // POST/PUT/PATCH/DELETE のみ CSRF トークンを追加
  const method = init?.method?.toUpperCase() || 'GET';
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (needsCsrf && csrfToken) {
    const headers = new Headers(init?.headers || {});
    headers.set('X-CSRF-Token', csrfToken);

    return fetch(input, {
      ...init,
      headers
    });
  }

  return fetch(input, init);
}

/**
 * グローバル fetch を CSRF 対応版で置き換える（オプション）
 *
 * CAUTION: この関数を呼ぶと、すべての fetch リクエストが CSRF トークン付きになります。
 * 必要に応じて _app.tsx や layout.tsx で呼び出してください。
 *
 * @example
 * // app/layout.tsx or _app.tsx
 * import { interceptGlobalFetch } from '@/utils/security/csrf-client';
 *
 * if (typeof window !== 'undefined') {
 *   interceptGlobalFetch();
 * }
 */
export function interceptGlobalFetch(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const originalFetch = window.fetch;

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    return secureFetch(input, init);
  };

  // デバッグ用
  console.log('✅ Global fetch intercepted for CSRF protection');
}
