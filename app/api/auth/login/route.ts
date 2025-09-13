// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // Create SSR Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  try {
    const body = await request.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }

    // Supabaseでログイン
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // ユーザーのAPIキー情報を取得
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Componentからの呼び出し
            }
          },
        },
        auth: { persistSession: false }
      }
    );

    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('key_prefix, key_suffix, name, is_active')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .limit(1);

    // レスポンスの作成 - SSRクライアントがCookieを自動管理
    return NextResponse.json({
      success: true,
      message: 'ログインに成功しました',
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || '',
        company: authData.user.user_metadata?.company || null,
        plan: authData.user.user_metadata?.plan || 'beta',
        apiKey: apiKeys && apiKeys.length > 0
          ? `${apiKeys[0].key_prefix}...${apiKeys[0].key_suffix}`
          : null,
        createdAt: authData.user.created_at
      },
      session: authData.session
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// セッション確認用（オプション）
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // Create SSR Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentからの呼び出し
          }
        },
      },
    }
  );

  // Supabaseでセッションを検証
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { 
      authenticated: true,
      message: 'セッションは有効です',
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name
      }
    },
    { status: 200 }
  );
}