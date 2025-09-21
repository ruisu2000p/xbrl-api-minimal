import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // セキュリティのため、本番環境では実行しない
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 })
  }

  return NextResponse.json({
    env_check: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      XBRL_SUPABASE_SERVICE_KEY: !!process.env.XBRL_SUPABASE_SERVICE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      // 実際の値の最初の数文字のみ表示（セキュリティのため）
      url_preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      anon_key_preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...',
      service_key_preview: (process.env.XBRL_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.substring(0, 30) + '...',
    }
  })
}