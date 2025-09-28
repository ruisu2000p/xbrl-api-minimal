import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type JwtPayload = {
  exp?: number
  sub?: string
  email?: string
  aud?: string
  role?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  // Vercel本番用のドメイン設定
  ...(process.env.NODE_ENV === 'production' && {
    domain: '.vercel.app'
  })
}

const FALLBACK_EXPIRY_SECONDS = 60 * 60

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) {
      return null
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const json = Buffer.from(padded, 'base64').toString('utf8')

    return JSON.parse(json)
  } catch (error) {
    console.error('Failed to decode JWT payload:', error)
    return null
  }
}

function getProjectRef() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, refresh_token } = body

    console.log('🔐 Cookie同期: トークン受信', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      accessTokenLength: access_token?.length || 0,
      refreshTokenLength: refresh_token?.length || 0
    })

    if (!access_token || !refresh_token) {
      console.error('⚠️ Cookie同期: トークン不足')
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      )
    }

    const payload = decodeJwt(access_token)
    const nowSeconds = Math.floor(Date.now() / 1000)
    const expiresAt = typeof payload?.exp === 'number'
      ? payload.exp
      : nowSeconds + FALLBACK_EXPIRY_SECONDS
    const secondsUntilExpiry = expiresAt - nowSeconds

    if (secondsUntilExpiry <= 0) {
      console.error('⚠️ Cookie同期: 既に期限切れのアクセストークン')
      return NextResponse.json(
        { error: 'Access token expired' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
    const maxAge = secondsUntilExpiry || FALLBACK_EXPIRY_SECONDS

    // アクセストークンをCookieに設定
    cookieStore.set('sb-access-token', access_token, {
      ...COOKIE_OPTIONS,
      maxAge
    })

    // リフレッシュトークンをCookieに設定
    cookieStore.set('sb-refresh-token', refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30
    })

    const projectRef = getProjectRef()
    if (projectRef) {
      const userPayload = payload
        ? {
            id: payload.sub,
            aud: payload.aud,
            email: payload.email,
            role: payload.role,
            app_metadata: payload.app_metadata ?? {},
            user_metadata: payload.user_metadata ?? {}
          }
        : undefined

      const supabaseSession = {
        access_token,
        refresh_token,
        token_type: 'bearer',
        expires_in: maxAge,
        expires_at: expiresAt,
        provider_token: null,
        provider_refresh_token: null,
        user: userPayload
      }

      const supabaseCookiePayload = {
        currentSession: supabaseSession,
        currentUser: userPayload,
        expiresAt
      }

      const supabaseCookieName = `sb-${projectRef}-auth-token`
      cookieStore.set(supabaseCookieName, JSON.stringify(supabaseCookiePayload), {
        ...COOKIE_OPTIONS,
        maxAge
      })

      console.log('✅ Cookie同期: Supabase認証Cookieを設定', {
        cookie: supabaseCookieName,
        expiresAt,
        maxAge
      })
    } else {
      console.warn('⚠️ Cookie同期: Supabaseのプロジェクトリファレンスを解析できませんでした')
    }

    console.log('✅ Cookie同期: トークンをCookieへ保存', {
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      maxAge
    })

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Cookie同期中にエラーが発生しました:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    console.log('🧹 Cookie同期: トークン削除開始')
    const cookieStore = cookies()

    cookieStore.delete('sb-access-token')
    cookieStore.delete('sb-refresh-token')

    const projectRef = getProjectRef()
    if (projectRef) {
      const supabaseCookieName = `sb-${projectRef}-auth-token`
      cookieStore.delete(supabaseCookieName)
    }

    console.log('✅ Cookie同期: トークン削除完了')

    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Cookie削除中にエラーが発生しました:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
