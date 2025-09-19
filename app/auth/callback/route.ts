import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { RedirectValidator } from '@/lib/security/redirect-validator'
import { OAuthSecurityValidator } from '@/lib/auth/oauth-security'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    let next = searchParams.get('next') ?? '/dashboard'

    // 🛡️ リダイレクトURL検証を最優先実行
    const redirectValidation = RedirectValidator.validateRedirectUrl(next, request.url)

    if (!redirectValidation.isValid) {
      // セキュリティ違反をログ記録
      RedirectValidator.logSecurityViolation({
        originalUrl: next,
        error: redirectValidation.error!,
        code: redirectValidation.code!,
        threat: redirectValidation.threat,
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') || undefined,
        requestId
      })

      // セキュリティ違反時は安全なフォールバック
      return NextResponse.redirect(
        new URL('/auth/login?error=invalid_redirect', request.url),
        {
          status: 302,
          headers: {
            'X-Security-Violation': redirectValidation.code!,
            'X-Request-ID': requestId,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      )
    }

    // 🛡️ OAuth State検証（提供されている場合）
    if (state) {
      const stateValidation = OAuthSecurityValidator.validateOAuthState(state, request.url)

      if (!stateValidation.isValid) {
        OAuthSecurityValidator.logOAuthSecurityEvent({
          event: 'STATE_VALIDATION_FAILED',
          severity: 'HIGH',
          details: {
            error: stateValidation.error,
            code: stateValidation.code,
            threat: stateValidation.threat
          },
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        })

        return NextResponse.redirect(
          new URL('/auth/login?error=invalid_state', request.url),
          {
            headers: {
              'X-Security-Violation': stateValidation.code!,
              'X-Request-ID': requestId
            }
          }
        )
      }

      // State内のリダイレクトURLを優先（検証済み）
      if (stateValidation.redirectUrl) {
        next = stateValidation.redirectUrl
      }
    }

    // OAuth認証処理
    if (code) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.redirect(
          new URL('/auth/login?error=config', request.url)
        )
      }

      const cookieStore = await cookies()
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options)
                })
              } catch (error) {
                console.warn('Cookie setting failed:', error)
              }
            },
          },
        }
      )

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data?.session) {
        // 🛡️ セキュリティログ: 成功認証
        console.log('✅ Secure authentication redirect:', {
          requestId,
          userId: data.session.user.id,
          redirectUrl: redirectValidation.sanitizedUrl,
          urlType: redirectValidation.urlType,
          processingTime: Date.now() - startTime
        })

        // 検証済みURLでリダイレクト
        return NextResponse.redirect(
          new URL(redirectValidation.sanitizedUrl!, request.url),
          {
            status: 302,
            headers: {
              'X-Security-Status': 'VALIDATED',
              'X-Redirect-Type': redirectValidation.urlType!,
              'X-Request-ID': requestId,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }
        )
      }

      // 認証エラーの場合
      console.warn('⚠️ Authentication failed:', {
        requestId,
        error: error?.message,
        code
      })
    }

    // エラーまたはコードなしの場合はログインページへ
    return NextResponse.redirect(
      new URL('/auth/login?error=auth', request.url),
      {
        headers: {
          'X-Request-ID': requestId
        }
      }
    )

  } catch (error) {
    console.error('❌ Auth callback error:', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.redirect(
      new URL('/auth/login?error=server', request.url),
      {
        headers: {
          'X-Request-ID': requestId
        }
      }
    )
  }
}