// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Create Supabase clients inside the function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;
  try {
    const body = await request.json();
    const { email } = body;

    // バリデーション
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { success: false, error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // Supabaseのパスワードリセット機能を使用
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xbrl-api-minimal.vercel.app'}/reset-password`,
    });

    if (error) {
      console.error('Supabase password reset error:', error);
      // セキュリティのため、詳細なエラーは返さない
      return NextResponse.json({
        success: true,
        message: 'パスワードリセット用のメールを送信しました'
      }, { status: 200 });
    }

    console.log(`Password reset email sent to: ${email}`);

    // セキュリティのため、メールアドレスの存在有無に関わらず同じレスポンスを返す
    return NextResponse.json({
      success: true,
      message: 'パスワードリセット用のメールを送信しました'
    }, { status: 200 });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// トークンの検証（GET） - Supabaseのリカバリートークンは自動検証されるので簡易版
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json(
      { message: 'Supabaseのパスワードリセット機能を使用してください' },
      { status: 200 }
    );
  }

  // Create Supabase admin client if service key is available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

  // メールアドレスでユーザーの存在確認（supabaseAdminが利用可能な場合）
  if (supabaseAdmin) {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    if (user) {
      return NextResponse.json(
        { valid: true, email: user.email },
        { status: 200 }
      );
    }
  }

  return NextResponse.json(
    { valid: false, error: 'ユーザーが見つかりません' },
    { status: 404 }
  );
}