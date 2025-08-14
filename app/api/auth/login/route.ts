import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// パスワードのハッシュ化
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// デモアカウント（実際にはデータベースから取得）
const demoAccounts = new Map([
  ['demo@example.com', {
    id: 'demo-user-001',
    email: 'demo@example.com',
    password: hashPassword('demo1234'),
    name: 'デモユーザー',
    company: 'デモ株式会社',
    plan: 'beta',
    apiKey: 'xbrl_demo_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    createdAt: '2025-01-01T00:00:00Z',
    usage: {
      apiCalls: 245,
      lastReset: new Date().toISOString(),
      monthlyLimit: 1000
    }
  }],
  ['test@example.com', {
    id: 'test-user-001',
    email: 'test@example.com',
    password: hashPassword('test1234'),
    name: 'テストユーザー',
    company: 'テスト企業',
    plan: 'beta',
    apiKey: 'xbrl_test_q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6',
    createdAt: '2025-01-01T00:00:00Z',
    usage: {
      apiCalls: 123,
      lastReset: new Date().toISOString(),
      monthlyLimit: 1000
    }
  }]
]);

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

    // ユーザーの検索（デモ用：実際はデータベースから）
    const user = demoAccounts.get(email.toLowerCase());
    
    if (!user) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワードの検証
    const hashedInputPassword = hashPassword(password);
    if (user.password !== hashedInputPassword) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // セッショントークンの生成
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // パスワードを除外してユーザー情報を返す
    const { password: _, ...safeUser } = user;

    // レスポンスの作成
    const response = NextResponse.json({
      success: true,
      message: 'ログインに成功しました',
      user: safeUser,
      sessionToken
    }, { status: 200 });

    // セッションCookieの設定
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30日間
    });

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
  const sessionToken = request.cookies.get('session')?.value;
  
  if (!sessionToken) {
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    );
  }

  // 実際はセッションの検証を行う
  return NextResponse.json(
    { 
      authenticated: true,
      message: 'セッションは有効です'
    },
    { status: 200 }
  );
}