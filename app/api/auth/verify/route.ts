import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = (url.searchParams.get('type') ?? 'recovery') as EmailOtpType
  const redirect_to = url.searchParams.get('redirect_to') ?? '/reset-password'

  console.log('Verify route called:', { token_hash, type, redirect_to })

  if (!token_hash) {
    console.error('Missing token_hash parameter')
    return NextResponse.redirect(new URL(`${redirect_to}?error=missing_token`, req.url))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (setCookies) => {
          setCookies.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // サーバー側でセッションを獲得（Cookieに保存）
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  })

  if (error) {
    console.error('OTP verification failed:', error)
    return NextResponse.redirect(new URL(`${redirect_to}?error=verification_failed&message=${encodeURIComponent(error.message)}`, req.url))
  }

  if (!data?.session) {
    console.error('No session returned from verifyOtp')
    return NextResponse.redirect(new URL(`${redirect_to}?error=no_session`, req.url))
  }

  console.log('OTP verified successfully, session established:', data.session.user.email)

  // Cookieにセッションが入った状態でパスワード変更画面へ
  const res = NextResponse.redirect(new URL(redirect_to, req.url))
  res.headers.set('Cache-Control', 'no-store')
  return res
}
