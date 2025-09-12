// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // バリデーション - emailを使用する簡易版
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'パスワードは8文字以上にしてください' },
        { status: 400 }
      );
    }

    // メールアドレスからユーザーを検索
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    
    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合も成功を返す
      return NextResponse.json({
        success: true,
        message: 'パスワードが正常に変更されました'
      }, { status: 200 });
    }

    // Supabase Admin APIでパスワードを更新
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (error) {
      console.error('Supabase password update error:', error);
      return NextResponse.json(
        { success: false, error: 'パスワードの更新に失敗しました' },
        { status: 500 }
      );
    }

    console.log(`Password updated for user: ${email}`);

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'パスワードが正常に変更されました'
    }, { status: 200 });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// パスワード強度チェック用のヘルパー（オプション）
export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get('password');
  
  if (!password) {
    return NextResponse.json(
      { strong: false },
      { status: 200 }
    );
  }

  // パスワード強度の簡易チェック
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= 8;
  
  const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar, isLongEnough]
    .filter(Boolean).length;

  return NextResponse.json({
    strong: strength >= 3,
    strength: strength,
    requirements: {
      length: isLongEnough,
      uppercase: hasUpperCase,
      lowercase: hasLowerCase,
      numbers: hasNumbers,
      special: hasSpecialChar
    }
  }, { status: 200 });
}