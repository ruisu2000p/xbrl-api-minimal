// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Supabase Admin Client (for user lookup)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
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

  // メールアドレスでユーザーの存在確認
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);

  if (user) {
    return NextResponse.json(
      { valid: true, email: user.email },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { valid: false, error: 'ユーザーが見つかりません' },
    { status: 404 }
  );
}