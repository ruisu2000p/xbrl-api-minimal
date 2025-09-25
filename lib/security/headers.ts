import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_ENABLE_SECURITY_HEADERS === 'true';

  // ── CORS: プリフライト対応のため許可オリジンを確定 ──
  const origin = request.headers.get('origin');
  const allowedOrigins = new Set<string>([
    'https://xbrl-api-minimal.vercel.app',
    // 自サイトの本番ドメインがあるならここに追加
    // 例: 'https://example.com',
  ]);

  // プレビュー環境を許可したい場合は env で制御
  if (process.env.NEXT_PUBLIC_ALLOW_VERCEL_PREVIEW === 'true') {
    // 必要なら特定の Preview URL のみ許可にする
    // allowedOrigins.add('https://<your-preview>.vercel.app');
  }

  // ── セキュリティヘッダー ──
  if (isProd) {
    // HSTS（preload はサイト全体HTTPS運用が整っていることが前提）
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains' + (process.env.NEXT_PUBLIC_HSTS_PRELOAD === 'true' ? '; preload' : '')
    );

    // クリックジャッキング対策（CSPの frame-ancestors と併用）
    response.headers.set('X-Frame-Options', 'DENY');

    // MIME スニッフィング無効化
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // リファラーポリシー
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // DNS プリフェッチ無効化（必要なら 'on' に）
    response.headers.set('X-DNS-Prefetch-Control', 'off');

    // Adobe製品のクロスドメイン読み込み抑制
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // クロスオリジン分離（必要に応じて有効化。SharedArrayBuffer等を使う場合に推奨）
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp'); // 使わないなら外してOK
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Permissions-Policy
    response.headers.set(
      'Permissions-Policy',
      [
        'accelerometer=()',
        'camera=()',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'microphone=()',
        'payment=()',
        'usb=()',
      ].join(', ')
    );

    // ── CSP ──
    // できるだけ 'unsafe-inline' / 'unsafe-eval' は避ける
    const supabaseBase = 'https://*.supabase.co';
    const vercelLive = 'https://vercel.live';
    const connectSrc = [
      "'self'",
      supabaseBase,            // REST/Auth/Storage/Edge Functions
      'wss://*.supabase.co',   // Realtime
      vercelLive,              // live preview を使う場合
    ];

    const cspParts = [
      "default-src 'self'",
      // 開発・プレビューで必要なら 'unsafe-eval' を条件付きで
      `script-src 'self' 'unsafe-inline'${process.env.NEXT_PUBLIC_ALLOW_UNSAFE_EVAL === 'true' ? " 'unsafe-eval'" : ''} https://cdn.jsdelivr.net https://cdnjs.cloudflare.com ${vercelLive}`,
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://cdnjs.cloudflare.com",
      `connect-src ${connectSrc.join(' ')}`,
      `frame-src 'self' ${vercelLive}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      // レポート先（新方式）。専用エンドポイントを用意できるとベター
      // "report-to csp-endpoint",
      // "report-uri /api/csp-report", // 旧式。使うならバックエンド実装も
    ];

    response.headers.set('Content-Security-Policy', cspParts.join('; '));

    // Reporting-Endpoints（必要な場合のみ）
    // response.headers.set('Reporting-Endpoints', 'csp-endpoint="/api/csp-report"');
    // response.headers.set('Report-To', JSON.stringify({ group: 'csp-endpoint', max_age: 10886400, endpoints: [{ url: '/api/csp-report' }] }));
  }

  // ── CORS ──
  if (origin && allowedOrigins.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin'); // キャッシュ分離
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  }

  return response;
}

/**
 * もし middleware でプリフライトを処理するなら補助関数（任意）
 */
export function maybeHandlePreflight(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    // applySecurityHeaders を通して CORS/ヘッダーを付加して返す
    return applySecurityHeaders(req, res);
  }
  return null;
}