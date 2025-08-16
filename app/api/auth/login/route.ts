import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードを入力してください' },
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
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // ユーザーのAPIキー情報を取得
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('key_prefix, key_suffix, name, is_active')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .limit(1);

    // レスポンスの作成
    const response = NextResponse.json({
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

    // Supabaseのセッショントークンをクッキーに設定
    if (authData.session) {
      response.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30日間
      });

      response.cookies.set('sb-refresh-token', authData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30日間
      });
    }

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// セッション確認用（オプション）
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  
  if (!accessToken) {
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    );
  }

  // Supabaseでセッショントークンを検証
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

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