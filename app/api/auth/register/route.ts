// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Supabase環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// デバッグ情報（本番環境では削除すること）
console.log('Environment check:', {
  hasUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  urlPrefix: supabaseUrl?.substring(0, 30),
  keyLength: supabaseServiceKey?.length,
  nodeEnv: process.env.NODE_ENV
});

// エラーチェック
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:', {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
  });
  throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.');
}

// Supabase Admin Client
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } }
);

// APIキーの生成
function generateApiKey(): string {
  const prefix = 'xbrl_live_';
  const randomPart = crypto.randomBytes(24).toString('base64')
    .replace(/\+/g, '0')
    .replace(/\//g, '1')
    .replace(/=/g, '');
  return prefix + randomPart;
}

// APIキーのハッシュ化
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, company, plan, agreeToTerms, agreeToDisclaimer } = body;

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
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

    // Supabaseで既存ユーザーをチェック
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      );
    }

    // Supabase Authでユーザーを作成
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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
        { error: 'ユーザー登録に失敗しました' },
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
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 16);
    const keySuffix = apiKey.slice(-4);

    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        is_active: true
      })
      .select()
      .single();

    if (apiKeyError) {
      console.error('API key creation error:', apiKeyError);
      // APIキー作成失敗時でもユーザー登録は成功として扱う
      return NextResponse.json({
        success: true,
        message: '登録が完了しました（APIキーは後で発行してください）',
        user: {
          id: userId,
          email,
          name,
          company: company || null,
          plan: plan || 'beta'
        },
        warning: 'APIキーの自動発行に失敗しました。ダッシュボードから手動で発行してください。'
      }, { status: 201 });
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
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ユーザー情報の取得（デバッグ用）
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  
  if (!email) {
    // 全ユーザー数を返す
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    return NextResponse.json(
      { 
        count: allUsers?.users?.length || 0, 
        message: 'Supabase登録済みユーザー数',
        users: allUsers?.users?.map(u => ({ email: u.email, created_at: u.created_at }))
      },
      { status: 200 }
    );
  }

  // 特定ユーザーの情報を取得
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);
  
  if (!user) {
    return NextResponse.json(
      { error: 'ユーザーが見つかりません' },
      { status: 404 }
    );
  }

  // APIキー情報も取得
  const { data: apiKeys } = await supabaseAdmin
    .from('api_keys')
    .select('key_prefix, key_suffix, name, is_active, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name,
    company: user.user_metadata?.company,
    plan: user.user_metadata?.plan || 'beta',
    created_at: user.created_at,
    email_confirmed: !!user.email_confirmed_at,
    api_keys: apiKeys?.map(k => ({
      display: `${k.key_prefix}...${k.key_suffix}`,
      name: k.name,
      active: k.is_active,
      created_at: k.created_at
    }))
  }, { status: 200 });
}