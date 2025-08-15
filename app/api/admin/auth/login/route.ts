import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者アカウント（本番環境ではSupabaseに保存）
const ADMIN_CREDENTIALS = {
  email: 'admin@xbrl-api.com',
  passwordHash: crypto.createHash('sha256').update('Admin@2024#XBRL').digest('hex'),
  role: 'admin'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 入力検証
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードを入力してください' },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // 管理者認証（簡易版 - 本番環境ではSupabase Authを使用）
    if (email !== ADMIN_CREDENTIALS.email || passwordHash !== ADMIN_CREDENTIALS.passwordHash) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // セッショントークン生成
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24時間有効

    // ユーザー情報
    const user = {
      id: 'admin-001',
      email: ADMIN_CREDENTIALS.email,
      name: '管理者',
      role: ADMIN_CREDENTIALS.role
    };

    // アクティビティログを記録
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: user.id,
          action_type: 'login',
          description: 'Admin login successful',
          metadata: { 
            email: user.email,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // ログ記録に失敗してもログインは続行
    }

    return NextResponse.json({
      success: true,
      token,
      user,
      expiresAt: expiresAt.toISOString()
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}