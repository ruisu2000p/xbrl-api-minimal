// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, ErrorCodes } from '@/lib/utils/api-response-v2';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { generateBcryptApiKey } from '@/lib/security/bcrypt-apikey';


async function checkUserExistsViaSignIn(
  supabaseClient: SupabaseClient,
  email: string
): Promise<boolean> {
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: 'dummy_check_only', // 存在チェックのみ
    });

    return Boolean(error?.message?.includes('Invalid login credentials'));
  } catch (error) {
    console.warn('User existence check via sign-in failed:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, company, plan, agreeToTerms, agreeToDisclaimer } = body;

    // バリデーション
    if (!email || !password || !name) {
      return createApiResponse.error(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        '必須項目が入力されていません'
      );
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return createApiResponse.validationError({
        password: ['パスワードは8文字以上にしてください']
      });
    }

    // 通常のクライアントを使用（Service Roleが設定されていない場合を考慮）
    const supabase: SupabaseClient = await createClient();

    let supabaseAdmin: SupabaseClient | null = null;
    try {
      supabaseAdmin = await createServiceClient();
    } catch (error) {
      console.warn('Service role client is not available. Falling back to limited checks.', error);
    }

    // Supabaseで既存ユーザーをチェック（メールアドレスで確認）
    // 注: auth.usersへの直接アクセスはService Roleが必要
    let existingUser = null;
    let searchError: { code?: string } | null = null;

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('auth.users')
        .select('id, email')
        .eq('email', email)
        .single();

      existingUser = data;
      searchError = error;
    }

    // auth.usersへの直接アクセスが失敗した場合やService Roleがない場合は、従来の方法にフォールバック
    if (!supabaseAdmin || (searchError && searchError.code !== 'PGRST116')) { // PGRST116 = not found
      const userExists = await checkUserExistsViaSignIn(supabase, email);

      if (userExists) {
        return createApiResponse.error(
          ErrorCodes.ALREADY_EXISTS,
          'このメールアドレスは既に登録されています'
        );
      }
    } else if (!searchError && existingUser) {
      return createApiResponse.error(
        ErrorCodes.ALREADY_EXISTS,
        'このメールアドレスは既に登録されています'
      );
    }

    // Supabase Authでユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
        name,
        company: company || null,
        plan: plan || 'beta',
        agreed_to_terms: true,
        agreed_to_disclaimer: true,
        agreed_at: new Date().toISOString()
        }
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json(
        { success: false, error: 'ユーザー登録に失敗しました' },
        { status: 500 }
      );
    }

    const userId = authData.user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザー作成に失敗しました' },
        { status: 500 }
      );
    }

    // public.usersテーブルにも保存
    const { error: dbUserError } = await supabase
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
    let apiKey = null;
    try {
      const { apiKey: generatedKey, hash: keyHash, prefix: keyPrefix, suffix: keySuffix } = await generateBcryptApiKey();
      apiKey = generatedKey;

      // privateスキーマへのアクセスにはService Roleが必要な場合があるため、利用可能な方を使用
      const dbClient = supabaseAdmin || supabase;
      const { data: apiKeyData, error: apiKeyError } = await dbClient
        .from('api_keys_main')
        .schema('private')
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
        // APIキー作成に失敗してもユーザー登録は成功とする
        apiKey = null;
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
      // APIキー生成に失敗してもユーザー登録は成功とする
      apiKey = null;
    }
    
    // セキュリティのため、機密情報はログに出力しない
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ User registered successfully:', { userId });
    }

    // セッションはsignUpで自動的に作成される

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