import { cookies, headers } from 'next/headers';

/**
 * CSRF トークン検証ヘルパー（共通化）
 *
 * Double Submit Cookie パターン:
 * - Cookie の csrf-token と Header の X-CSRF-Token が一致することを確認
 *
 * @returns true if CSRF token is valid, false otherwise
 *
 * @example
 * import { verifyCsrf } from '@/utils/security/verifyCsrf';
 *
 * export async function POST(req: Request) {
 *   if (!verifyCsrf()) {
 *     return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
 *   }
 *   // ... 処理続行
 * }
 */
export function verifyCsrf(): boolean {
  const cookieVal = cookies().get('csrf-token')?.value ?? '';
  const headerVal = headers().get('x-csrf-token') ?? '';

  return cookieVal.length > 0 && cookieVal === headerVal;
}
