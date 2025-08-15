import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Supabaseのusersテーブルから管理者を確認
    const { data: adminUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (dbError || !adminUser) {
      console.error('Admin user not found:', dbError);
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワード検証（簡易版 - 本番環境ではSupabase Authを使用推奨）
    // 一時的にハードコードされたパスワードと照合
    const expectedPassword = 'Admin@2024#XBRL';
    if (password !== expectedPassword) {
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
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name || '管理者',
      role: adminUser.role
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