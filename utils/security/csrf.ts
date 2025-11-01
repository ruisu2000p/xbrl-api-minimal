import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF トークン検証（Double-Submit Cookie パターン）
 *
 * POST/PUT/PATCH/DELETE リクエストに対して、
 * ヘッダーの X-CSRF-Token と Cookie の csrf-token が一致することを確認
 *
 * @throws Response 403 if CSRF token is invalid
 */
export async function verifyCsrf(request: NextRequest): Promise<void> {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return; // GET など安全なメソッドはスキップ
  }

  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('csrf-token')?.value;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    console.error('🚨 Security: CSRF token validation failed', {
      hasHeader: !!headerToken,
      hasCookie: !!cookieToken,
      match: headerToken === cookieToken
    });

    throw new Response(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * CSRF トークンを発行してCookieに設定
 *
 * GET リクエストやページレンダリング時に呼び出し、
 * クライアント側で X-CSRF-Token ヘッダーに含めて送信する
 *
 * @param response NextResponse object
 */
export function issueCsrfCookie(response: NextResponse): void {
  // 既存のトークンがある場合は再利用
  const existingToken = response.cookies.get('csrf-token')?.value;

  if (existingToken) {
    return;
  }

  // 新しいトークンを生成（UUID からハイフンを削除）
  const token = crypto.randomUUID().replace(/-/g, '');

  response.cookies.set('csrf-token', token, {
    httpOnly: false, // JavaScript から読み取れるようにする
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // strict だと厳しすぎるので lax に変更
    path: '/',
    maxAge: 60 * 60 * 24 // 24時間
  });
}

/**
 * クライアント側で CSRF トークンを取得するヘルパー関数
 * （このファイルはサーバー専用だが、参考実装として記載）
 *
 * @example
 * // クライアント側（app/components/など）
 * function getCsrfToken(): string | null {
 *   const cookies = document.cookie.split('; ');
 *   const csrfCookie = cookies.find(row => row.startsWith('csrf-token='));
 *   return csrfCookie ? csrfCookie.split('=')[1] : null;
 * }
 *
 * // fetch時に使用
 * await fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': getCsrfToken() || ''
 *   },
 *   body: JSON.stringify(data)
 * });
 */
