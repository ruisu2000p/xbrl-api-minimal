// 管理者用パスワードリセット
// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Create Supabase admin client inside the function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    // バリデーション
    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスと新しいパスワードを入力してください' },
        { status: 400 }
      );
    }

    // パスワードの長さチェック
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'パスワードは8文字以上にしてください' },
        { status: 400 }
      );
    }

    // ユーザーを検索
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { success: false, error: 'ユーザー検索に失敗しました' },
        { status: 500 }
      );
    }

    const user = users?.users?.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // パスワードを更新
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      console.error('Password update error:', error);
      return NextResponse.json(
        { success: false, error: 'パスワードの更新に失敗しました: ' + error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Password successfully updated for user: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'パスワードを更新しました',
      email: email,
      userId: user.id
    }, { status: 200 });

  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// GET: ユーザー情報確認用
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'メールアドレスが必要です' },
      { status: 400 }
    );
  }

  // Create Supabase admin client inside the function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_confirmed: !!user.email_confirmed_at,
        metadata: user.user_metadata
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}