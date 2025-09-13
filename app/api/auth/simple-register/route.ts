// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Supabaseクライアントの作成
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return null;
  }

  // Service Roleキーがある場合は管理者権限で、なければ通常のクライアント
  if (serviceKey) {
    return createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  
  return createClient(url, anonKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上にしてください' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // ユーザー登録を試みる
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
          plan: 'free',
          created_at: new Date().toISOString()
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xbrl-api-minimal.vercel.app'}/dashboard`
      }
    });

    if (error) {
      // 既存ユーザーの場合
      if (error.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || '登録に失敗しました' },
        { status: 400 }
      );
    }

    // 登録成功
    if (data.user) {
      // APIキーを生成（オプション）
      const apiKey = `xbrl_live_${crypto.randomBytes(16).toString('hex')}`;
      
      // profilesテーブルに保存を試みる（エラーは無視）
      try {
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: name || email.split('@')[0],
            api_key: apiKey,
            plan: 'free'
          });
      } catch (e) {
        console.log('Profile creation skipped:', e);
      }

      return NextResponse.json({
        message: '登録が完了しました',
        user: {
          id: data.user.id,
          email: data.user.email
        },
        session: data.session
      });
    }

    return NextResponse.json(
      { error: '登録処理が完了しませんでした' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}