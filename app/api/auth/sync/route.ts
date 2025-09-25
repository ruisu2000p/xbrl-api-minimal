import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, refresh_token } = body

    if (!access_token || !refresh_token) {
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
    const cookieStore = cookies()

    // Cookieをクリア
    cookieStore.delete('sb-access-token')
    cookieStore.delete('sb-refresh-token')

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