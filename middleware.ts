import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 認証が必要なページの定義
  const protectedRoutes = ['/dashboard', '/api/dashboard']
  const authRoutes = ['/auth/login', '/auth/register']

  // 保護されたルートへのアクセス時
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      const url = new URL('/auth/login', request.url)
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }
  }

  // 認証済みユーザーが認証ページにアクセスした場合
  // ただし、登録直後のリダイレクトは除外
  if (authRoutes.some(route => pathname.startsWith(route)) && user) {
    // 登録完了パラメータがある場合は許可
    const searchParams = request.nextUrl.searchParams
    if (!searchParams.get('registered')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}