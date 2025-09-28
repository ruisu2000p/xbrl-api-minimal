// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, ErrorCodes } from '@/lib/utils/api-response-v2';
import { createClient, createServiceClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  // Create SSR Supabase client
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { email, password } = body;

    // バリデーション
    if (!email || !password) {
      return createApiResponse.error(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        'メールアドレスとパスワードを入力してください'
      );
    }

    // Supabaseでログイン
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return createApiResponse.error(
        ErrorCodes.INVALID_CREDENTIALS,
        'メールアドレスまたはパスワードが正しくありません'
      );
    }

    // ユーザーのAPIキー情報を取得
    const supabaseAdmin = await createServiceClient();

    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys_main')
      .select('key_prefix, key_suffix, name, is_active')
      .schema('private')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .limit(1);

    // レスポンスの作成 - SSRクライアントがCookieを自動管理
    return createApiResponse.success({
      message: 'ログインに成功しました',
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || '',
        company: authData.user.user_metadata?.company || null,
        plan: authData.user.user_metadata?.plan || 'beta',
        apiKey: apiKeys && apiKeys.length > 0
          ? `${apiKeys[0].key_prefix}...${apiKeys[0].key_suffix}`
          : null,
        createdAt: authData.user.created_at
      },
      session: authData.session
    });

  } catch (error) {
    return createApiResponse.internalError(
      error,
      'サーバーエラーが発生しました'
    );
  }
}

// セッション確認用（オプション）
export async function GET(request: NextRequest) {
  // Create SSR Supabase client
  const supabase = await createClient();

  // Supabaseでセッションを検証
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return createApiResponse.success({
      authenticated: false
    });
  }

  return createApiResponse.success({
    authenticated: true,
    message: 'セッションは有効です',
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name
    }
  });
}