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

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/'
}

function resolveCookieDomain(host: string | null) {
  if (!host) {
    return undefined
  }

  const hostname = host.split(':')[0].toLowerCase()

  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname === '127.0.0.1') {
    return undefined
  }

  return hostname
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
    const host = request.headers.get('host')
    const domain = resolveCookieDomain(host)
    const commonCookieOptions = {
      ...BASE_COOKIE_OPTIONS,
      ...(domain ? { domain } : {})
    }
    const maxAge = secondsUntilExpiry || FALLBACK_EXPIRY_SECONDS

    // アクセストークンをCookieに設定
    cookieStore.set('sb-access-token', access_token, {
      ...commonCookieOptions,
      maxAge
    })

    // リフレッシュトークンをCookieに設定
    cookieStore.set('sb-refresh-token', refresh_token, {
      ...commonCookieOptions,
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
        ...commonCookieOptions,
        maxAge
      })

      console.log('✅ Cookie同期: Supabase認証Cookieを設定', {
        cookie: supabaseCookieName,
        expiresAt,
        maxAge,
        domain
      })
    } else {
      console.warn('⚠️ Cookie同期: Supabaseのプロジェクトリファレンスを解析できませんでした')
    }

    console.log('✅ Cookie同期: トークンをCookieへ保存', {
      secure: BASE_COOKIE_OPTIONS.secure,
      sameSite: BASE_COOKIE_OPTIONS.sameSite,
      maxAge,
      domain
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

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Cookie同期: トークン削除開始')
    const cookieStore = cookies()
    const host = request.headers.get('host')
    const domain = resolveCookieDomain(host)
    const deleteBase = {
      path: '/',
      ...(domain ? { domain } : {})
    }

    cookieStore.delete({ name: 'sb-access-token', ...deleteBase })
    cookieStore.delete({ name: 'sb-refresh-token', ...deleteBase })

    const projectRef = getProjectRef()
    if (projectRef) {
      const supabaseCookieName = `sb-${projectRef}-auth-token`
      cookieStore.delete({ name: supabaseCookieName, ...deleteBase })
    }

    console.log('✅ Cookie同期: トークン削除完了', { domain })

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
