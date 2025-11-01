/**
 * CSRF保護されたAPIを呼び出すヘルパー関数
 *
 * API叩く直前に最新のCSRFトークンを取得して送信することで、
 * トークンの鮮度問題を解決します。
 *
 * @param url - API endpoint (e.g., '/api/account/delete')
 * @param body - Request body (will be JSON.stringify'd)
 * @param options - Additional fetch options (optional)
 * @returns Response JSON
 *
 * @example
 * import { callProtectedApi } from '@/lib/callProtectedApi';
 *
 * try {
 *   const result = await callProtectedApi('/api/account/delete', {
 *     password: 'xxx',
 *     reason: 'too_expensive'
 *   });
 *   console.log('Success:', result);
 * } catch (error) {
 *   console.error('Failed:', error.message);
 * }
 */
export async function callProtectedApi<T = any>(
  url: string,
  body: any,
  options?: RequestInit
): Promise<T> {
  // API叩く直前に最新のCSRFトークンを取得
  const csrfRes = await fetch('/api/csrf', { credentials: 'include' });

  if (!csrfRes.ok) {
    throw new Error(`Failed to fetch CSRF token: ${csrfRes.status}`);
  }

  const { csrfToken } = await csrfRes.json();

  if (!csrfToken) {
    throw new Error('CSRF token not returned from /api/csrf');
  }

  // 保護されたAPIを呼び出し
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include', // 必須: Cookieを送信
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let errorMessage = `API ${url} failed: ${res.status}`;

    // JSONレスポンスからエラーメッセージを抽出
    try {
      const json = JSON.parse(text);
      if (json.error) errorMessage = json.error;
      else if (json.message) errorMessage = json.message;
    } catch {
      // JSON parse失敗時はtextをそのまま使用
      if (text) errorMessage += ` ${text}`;
    }

    throw new Error(errorMessage);
  }

  return res.json();
}
