// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 環境変数の存在確認（値は表示しない）
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  // 各ページの存在確認
  const pages = {
    '/auth/login': 'ログインページ',
    '/auth/register': '登録ページ',
    '/dashboard': 'ダッシュボード',
    '/test-auth': 'テストページ'
  };

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'xbrl-api-minimal',
    environment: process.env.NODE_ENV || 'production',
    env_configured: envStatus,
    pages_available: pages,
    api_version: 'v1',
    message: 'XBRL API is running'
  });
}