import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    // クッキーを使用してSupabaseクライアントを作成
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // サーバーコンポーネントからの呼び出しは無視
            }
          },
        },
      }
    );

    // セッションを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'セッションエラーが発生しました' },
        { status: 401 }
      );
    }

    if (!session?.user) {
      console.error('No user session found');
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const { keyName, tier = 'free' } = await request.json();

    if (!keyName || keyName.trim().length === 0) {
      return NextResponse.json(
        { error: 'APIキー名は必須です' },
        { status: 400 }
      );
    }

    // デバッグログ（Log Injection対策）
    const sanitizedKeyName = keyName.trim().replace(/[\r\n]/g, '_');
    const sanitizedTier = tier.replace(/[\r\n]/g, '_');
    console.log('Creating API key for user:', session.user.id);
    console.log('Key name:', sanitizedKeyName);
    console.log('Tier:', sanitizedTier);

    // Supabase RPC関数を呼び出してAPIキーを作成
    const { data: result, error: rpcError } = await supabase
      .rpc('create_api_key_complete_v2', {
        p_user_id: session.user.id,
        p_name: keyName.trim(),
        p_tier: tier
      });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return NextResponse.json(
        { error: `APIキーの作成に失敗しました: ${rpcError.message}` },
        { status: 500 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'APIキーの作成に失敗しました' },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      apiKey: result.api_key,
      keyId: result.key_id,
      message: 'APIキーが正常に作成されました'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// セッション確認用のGETエンドポイント
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // サーバーコンポーネントからの呼び出しは無視
            }
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { error: 'セッションエラー', details: error.message },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが存在しません' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: session.user.id,
      email: session.user.email,
      message: 'セッションは有効です'
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}