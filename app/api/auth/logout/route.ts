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

    // Also set cookies to expire on the response
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.set(cookie.name, '', {
          maxAge: 0,
          path: '/',
        });
      }
    }

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
