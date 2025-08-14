import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// メモリ内ストレージ（開発用）
// 本番環境ではデータベースを使用してください
const users = new Map<string, any>();
const apiKeys = new Map<string, any>();

// パスワードのハッシュ化（簡易版）
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// APIキーの生成（より短く、読みやすい形式）
function generateApiKey(): string {
  const prefix = 'xbrl_live_';
  const randomPart = crypto.randomBytes(24).toString('base64')
    .replace(/\+/g, '0')
    .replace(/\//g, '1')
    .replace(/=/g, '');
  return prefix + randomPart;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, company, plan } = body;

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    if (users.has(email)) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      );
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上にしてください' },
        { status: 400 }
      );
    }

    // APIキーの生成
    const apiKey = generateApiKey();
    const hashedPassword = hashPassword(password);
    
    // ユーザー情報の保存
    const userData = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      name,
      company: company || null,
      plan: plan || 'beta',
      apiKey,
      createdAt: new Date().toISOString(),
      emailVerified: false,
      verificationToken: crypto.randomBytes(32).toString('hex'),
      usage: {
        apiCalls: 0,
        lastReset: new Date().toISOString(),
        monthlyLimit: 1000
      }
    };

    users.set(email, userData);
    apiKeys.set(apiKey, userData.id);

    // セッショントークンの生成
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // レスポンスの作成
    const response = NextResponse.json({
      success: true,
      message: '登録が完了しました',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        company: userData.company,
        plan: userData.plan,
        apiKey: userData.apiKey
      },
      sessionToken
    }, { status: 201 });

    // セッションCookieの設定
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30日間
    });

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ユーザー情報の取得（デバッグ用）
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json(
      { count: users.size, message: '登録済みユーザー数' },
      { status: 200 }
    );
  }

  const user = users.get(email);
  if (!user) {
    return NextResponse.json(
      { error: 'ユーザーが見つかりません' },
      { status: 404 }
    );
  }

  // パスワードを除外して返す
  const { password, ...safeUser } = user;
  return NextResponse.json(safeUser, { status: 200 });
}