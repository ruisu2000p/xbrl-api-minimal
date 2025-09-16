// デバッグ用: 環境変数の確認
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // セキュリティのため、秘密鍵の一部のみ表示
  const maskSecret = (secret: string | undefined) => {
    if (!secret) return 'NOT_SET';
    return secret.substring(0, 10) + '...' + secret.substring(secret.length - 4);
  };

  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: maskSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: maskSecret(process.env.SUPABASE_SERVICE_ROLE_KEY),
    KEY_DERIVE_SECRET: maskSecret(process.env.KEY_DERIVE_SECRET),
    KEY_PEPPER: maskSecret(process.env.KEY_PEPPER),
    API_KEY_SECRET: maskSecret(process.env.API_KEY_SECRET),
    VERCEL: process.env.VERCEL || 'NOT_SET',
    VERCEL_ENV: process.env.VERCEL_ENV || 'NOT_SET',
  };

  return NextResponse.json({
    message: 'Environment Variables Check',
    timestamp: new Date().toISOString(),
    env: envVars,
    warning: 'This endpoint should be removed in production'
  });
}