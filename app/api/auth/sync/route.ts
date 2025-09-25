import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  // Vercel本番環境用のドメイン設定
  ...(process.env.NODE_ENV === 'production' && {
    domain: '.vercel.app' // Vercel全体で共有
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, refresh_token } = body

    console.log('🍪 Cookie同期: トークン受信', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      accessTokenLength: access_token?.length || 0,
      refreshTokenLength: refresh_token?.length || 0
    })

    if (!access_token || !refresh_token) {
      console.error('❌ Cookie同期: トークンが不足')
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()

    // アクセストークンをCookieに設定
    cookieStore.set('sb-access-token', access_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60, // 1時間
    })

    // リフレッシュトークンをCookieに設定
    cookieStore.set('sb-refresh-token', refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30, // 30日
    })

    console.log('✅ Cookie同期: トークンをCookieに保存完了', {
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite
    })

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    // Cookie同期エラー
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    console.log('🗑️ Cookie同期: トークン削除開始')
    const cookieStore = cookies()

    // Cookieをクリア
    cookieStore.delete('sb-access-token')
    cookieStore.delete('sb-refresh-token')

    console.log('✅ Cookie同期: トークン削除完了')

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    // Cookieクリアエラー
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}