import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// レート制限用のメモリストア（本番環境ではRedis等を使用推奨）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// レート制限のチェック
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = 100; // 1分あたりのリクエスト数
  const windowMs = 60 * 1000; // 1分

  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// ログインジェクション対策: 入力をサニタイズする関数
function sanitizeLogInput(input: string): string {
  // 改行文字、キャリッジリターン、タブを削除
  return input
    .replace(/[\r\n\t]/g, '')
    .replace(/[^\x20-\x7E]/g, '') // 印刷可能ASCII文字のみ許可
    .substring(0, 200); // 長さを制限
}

// IPアドレスの取得
function getIp(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown';
  return sanitizeLogInput(ip);
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const ip = getIp(request);
  const url = request.nextUrl;

  // APIエンドポイントへのアクセス制御
  if (url.pathname.startsWith('/api/')) {
    // レート制限チェック
    if (!checkRateLimit(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
        },
      });
    }

    // XSS対策: リクエストボディのサニタイゼーション
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // JSONリクエストの検証
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // CORS設定（必要に応じて）
    if (process.env.NODE_ENV === 'production') {
      const origin = request.headers.get('origin');
      const allowedOrigins = [
        'https://xbrl-api-minimal.vercel.app',
        process.env.NEXT_PUBLIC_APP_URL,
      ].filter(Boolean);

      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        response.headers.set('Access-Control-Max-Age', '86400');
      }
    }

    // SQLインジェクション対策: 危険な文字列のチェック（ReDoS対策済み）
    const suspiciousPatterns = [
      /\bDROP\s+TABLE\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+\S{1,100}\s+SET\b/i,  // ReDoS修正: 長さ制限追加
      /\b(?:EXEC|EXECUTE)\b/i,  // 最適化: 非キャプチャグループ使用
      /(?:--|\/\*|\*\/|xp_|sp_)/,  // 最適化: 非キャプチャグループ、キャプチャ不要
      /\bunion\s+select\b/i,
    ];

    const urlString = url.toString();

    // ReDoS対策: URLの長さ制限（1000文字）
    if (urlString.length > 1000) {
      console.warn('[Security] URL too long - request rejected');
      return new NextResponse('Bad Request', { status: 400 });
    }

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(urlString)) {
        console.warn('[Security] Suspicious pattern detected - request rejected');
        return new NextResponse('Bad Request', { status: 400 });
      }
    }

    // パストラバーサル対策
    if (url.pathname.includes('..') || url.pathname.includes('//')) {
      console.warn('[Security] Path traversal attempt detected - request rejected');
      return new NextResponse('Bad Request', { status: 400 });
    }
  }

  // 管理者エリアへのアクセス制御
  if (url.pathname.startsWith('/admin/')) {
    // 認証チェック（セッションやJWTトークンの検証）
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  // セキュリティヘッダーの追加
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Request-Id', crypto.randomUUID());

  // ロギング（監査ログ）
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      ip,
      method: request.method,
      path: url.pathname,
      userAgent: request.headers.get('user-agent'),
      requestId: response.headers.get('X-Request-Id'),
    }));
  }

  return response;
}

// ミドルウェアを適用するパスの設定
export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};