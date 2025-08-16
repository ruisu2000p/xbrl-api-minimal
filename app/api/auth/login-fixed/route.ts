import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // 環境変数チェック
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing environment variables');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          debug: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseAnonKey
          }
        },
        { status: 500 }
      );
    }

    // Supabase Client作成
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // ログイン試行
    console.log('Attempting login for:', email);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Login error:', authError);
      return NextResponse.json(
        { 
          error: 'メールアドレスまたはパスワードが正しくありません',
          details: authError.message 
        },
        { status: 401 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'ログインに失敗しました' },
        { status: 401 }
      );
    }

    // APIキー情報を取得（Service Roleキーが必要）
    let apiKeyDisplay = null;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
      });

      const { data: apiKeys } = await supabaseAdmin
        .from('api_keys')
        .select('key_prefix, key_suffix')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .limit(1);

      if (apiKeys && apiKeys.length > 0) {
        apiKeyDisplay = `${apiKeys[0].key_prefix}...${apiKeys[0].key_suffix}`;
      }
    }

    // レスポンス作成
    const response = NextResponse.json({
      success: true,
      message: 'ログインに成功しました',
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || '',
        company: authData.user.user_metadata?.company || null,
        plan: authData.user.user_metadata?.plan || 'beta',
        apiKey: apiKeyDisplay,
        createdAt: authData.user.created_at
      },
      session: {
        access_token: authData.session?.access_token,
        expires_at: authData.session?.expires_at
      }
    }, { status: 200 });

    // セッションクッキー設定
    if (authData.session) {
      response.cookies.set('sb-access-token', authData.session.access_token, {
        httpOnly: true,
        secure: true, // 本番環境では常にtrue
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30日間
      });
    }

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// デバッグ用：環境変数の状態を確認
export async function GET() {
  return NextResponse.json({
    status: 'Login endpoint ready',
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
}