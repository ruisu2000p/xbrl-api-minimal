import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  // セキュリティヘッダーの設定
  const headers = {
    // XSSフィルタリング有効化
    'X-XSS-Protection': '1; mode=block',

    // コンテンツタイプスニッフィング無効化
    'X-Content-Type-Options': 'nosniff',

    // クリックジャッキング対策
    'X-Frame-Options': 'DENY',

    // HTTPS強制
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // リファラーポリシー
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // パーミッションポリシー
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),

    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
      "frame-src 'self' https://vercel.live",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "report-uri /api/csp-report",
    ].join('; '),
  };

  // 本番環境でのみ適用
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SECURITY_HEADERS === 'true') {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // CORS設定
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://xbrl-api-minimal.vercel.app',
    'https://wpwqxhyiglbtlaimrjrx.supabase.co',
  ];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  }

  return response;
}