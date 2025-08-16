// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// パスワードリセットトークンの保存（実際はデータベース使用）
const resetTokens = new Map<string, { email: string; expires: Date }>();

// メール送信のシミュレーション（実際はメールサービス使用）
async function sendPasswordResetEmail(email: string, token: string) {
  // 本番環境では、SendGrid、AWS SES、Resend等のメールサービスを使用
  console.log(`
    ========================================
    パスワードリセットメール（開発用）
    ========================================
    宛先: ${email}
    
    パスワードリセットURL:
    ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}
    
    このリンクは1時間で有効期限が切れます。
    ========================================
  `);
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // バリデーション
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // リセットトークンの生成
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1時間後に期限切れ

    // トークンを保存（実際はデータベースに保存）
    resetTokens.set(resetToken, { email, expires });

    // メール送信
    await sendPasswordResetEmail(email, resetToken);

    // セキュリティのため、メールアドレスの存在有無に関わらず同じレスポンスを返す
    return NextResponse.json({
      success: true,
      message: 'パスワードリセット用のメールを送信しました'
    }, { status: 200 });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// トークンの検証（GET）
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { valid: false, error: 'トークンが必要です' },
      { status: 400 }
    );
  }

  const tokenData = resetTokens.get(token);

  if (!tokenData) {
    return NextResponse.json(
      { valid: false, error: '無効なトークンです' },
      { status: 400 }
    );
  }

  if (tokenData.expires < new Date()) {
    resetTokens.delete(token);
    return NextResponse.json(
      { valid: false, error: 'トークンの有効期限が切れています' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { valid: true, email: tokenData.email },
    { status: 200 }
  );
}