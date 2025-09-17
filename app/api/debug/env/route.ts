// デバッグ用: 環境変数の確認 - 本番環境では無効化
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 本番環境では完全に無効化
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }

  // 開発環境でのみ、認証チェックを追加
  const authHeader = request.headers.get('x-debug-token');
  const debugToken = process.env.DEBUG_ACCESS_TOKEN || 'development-only-token-2024';

  if (authHeader !== debugToken) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid debug token' },
      { status: 401 }
    );
  }

  // セキュリティのため、秘密鍵の一部のみ表示
  const maskSecret = (secret: string | undefined) => {
    if (!secret) return 'NOT_SET';
    // より安全に、最初の6文字と最後の3文字のみ表示
    if (secret.length <= 10) return '***MASKED***';
    return secret.substring(0, 6) + '...' + secret.substring(secret.length - 3);
  };

  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    // Public キーは部分的に表示
    NEXT_PUBLIC_SUPABASE_ANON_KEY: maskSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    // Service Role Keyは完全にマスク
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : 'NOT_SET',
    // その他の機密情報も完全マスク
    KEY_DERIVE_SECRET: process.env.KEY_DERIVE_SECRET ? '***SET***' : 'NOT_SET',
    KEY_PEPPER: process.env.KEY_PEPPER ? '***SET***' : 'NOT_SET',
    API_KEY_SECRET: process.env.API_KEY_SECRET ? '***SET***' : 'NOT_SET',
    VERCEL: process.env.VERCEL || 'NOT_SET',
    VERCEL_ENV: process.env.VERCEL_ENV || 'NOT_SET',
  };

  return NextResponse.json({
    message: 'Environment Variables Check (Development Only)',
    timestamp: new Date().toISOString(),
    env: envVars,
    warning: 'This endpoint is disabled in production and requires authentication'
  });
}