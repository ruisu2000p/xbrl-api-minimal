import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();

    // Set auth cookies
    cookieStore.set('sb-access-token', access_token, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    cookieStore.set('sb-refresh-token', refresh_token, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync authentication' },
      { status: 500 }
    );
  }
}
