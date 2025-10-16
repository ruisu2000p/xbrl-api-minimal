import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Sign out the user on the server side
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Server-side logout error:', error);
    }

    // Manually clear all Supabase auth cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Clear all cookies that start with 'sb-' (Supabase cookies)
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-')) {
        cookieStore.delete(cookie.name);
      }
    }

    const response = NextResponse.json({ success: true });

    // 🔒 セキュリティ: 既存のcookieを網羅的に削除
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.set(cookie.name, '', {
          maxAge: 0,
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
      }
    }

    // さらに、潜在的な重複cookieも削除（異なるpath/domain組み合わせ）
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
    if (projectRef) {
      for (let i = 0; i < 10; i++) {
        response.cookies.set(`sb-${projectRef}-auth-token.${i}`, '', {
          maxAge: 0,
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
      }
      response.cookies.set(`sb-${projectRef}-auth-token-code-verifier`, '', {
        maxAge: 0,
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });
    }

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
