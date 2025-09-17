// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateApiKey,
  hashApiKey,
  extractApiKeyPrefix,
  extractApiKeySuffix
} from '@/lib/security/apiKey';

// Supabase環境変数の確認（ビルド時ではなく実行時に評価）
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
    });
    return null;
  }

  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, company, plan, agreeToTerms, agreeToDisclaimer } = body;

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: '必須項目が入力されていません' },
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

    // Supabase Admin Clientを取得
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Supabaseで既存ユーザーをチェック
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      );
    }

    // Supabase Authでユーザーを作成
    // email_confirm: true でメール確認をスキップ
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // メール確認をスキップして即座に有効化
      user_metadata: {
        name,
        company: company || null,
        plan: plan || 'beta',
        agreed_to_terms: true,
        agreed_to_disclaimer: true,
        agreed_at: new Date().toISOString()
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json(
        { success: false, error: 'ユーザー登録に失敗しました' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // public.usersテーブルにも保存
    const { error: dbUserError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbUserError && dbUserError.code !== '23505') {
      console.error('Database user error:', dbUserError);
    }

    // APIキーの生成と保存
    const apiKey = generateApiKey('xbrl_live');
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = extractApiKeyPrefix(apiKey);
    const keySuffix = extractApiKeySuffix(apiKey);

    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        name: 'Default API Key',  // NOT NULL制約のため必須
        key_prefix: keyPrefix,
        key_suffix: keySuffix,  // suffixも保存
        key_hash: keyHash,
        is_active: true
      })
      .select()
      .single();

    if (apiKeyError) {
      console.error('API key creation error:', apiKeyError);
      // Rollback user creation if API key generation fails
      try {
        await supabaseAdmin.from('users').delete().eq('id', userId);
      } catch (dbDeleteError) {
        console.error('Failed to delete user record during rollback:', dbDeleteError);
      }
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (authDeleteError) {
        console.error('Failed to delete auth user during rollback:', authDeleteError);
      }
      return NextResponse.json(
        { success: false, error: 'APIキーの作成に失敗しました' },
        { status: 500 }
      );
    }
    
    console.log('✅ User registered with API key:', {
      email,
      userId,
      apiKeyPrefix: keyPrefix
    });

    // セッションの作成
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      }
    });

    // レスポンスの作成
    const response = NextResponse.json({
      success: true,
      message: '登録が完了しました',
      user: {
        id: userId,
        email,
        name,
        company: company || null,
        plan: plan || 'beta',
        apiKey // 初回のみ平文で返す
      }
    }, { status: 201 });

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// GETメソッドは削除 - セキュリティ上の理由で無効化
// ユーザー情報の取得には認証が必要なエンドポイントを使用してください