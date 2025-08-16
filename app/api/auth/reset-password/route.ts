// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// パスワードのハッシュ化
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// リセットトークンの保存（実際はデータベース使用）
// これは /api/auth/forgot-password で作成されたトークンを参照
const resetTokens = new Map<string, { email: string; expires: Date }>();

// デモアカウントのパスワード更新（実際はデータベース使用）
const userPasswords = new Map<string, string>([
  ['demo@example.com', hashPassword('demo1234')],
  ['test@example.com', hashPassword('test1234')]
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // バリデーション
    if (!token || !password) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上にしてください' },
        { status: 400 }
      );
    }

    // トークンの検証
    const tokenData = resetTokens.get(token);
    
    if (!tokenData) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 400 }
      );
    }

    // 有効期限チェック
    if (tokenData.expires < new Date()) {
      resetTokens.delete(token);
      return NextResponse.json(
        { error: 'トークンの有効期限が切れています' },
        { status: 400 }
      );
    }

    // パスワードの更新（実際はデータベースで更新）
    const hashedPassword = hashPassword(password);
    userPasswords.set(tokenData.email, hashedPassword);

    // トークンを削除（一度だけ使用可能）
    resetTokens.delete(token);

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'パスワードが正常に変更されました'
    }, { status: 200 });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
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