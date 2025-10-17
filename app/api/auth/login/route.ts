// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, ErrorCodes } from '@/lib/utils/api-response-v2';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';
import { limitOrThrow } from '@/utils/security/rate-limit';
import { logSecurityEvent } from '@/utils/security/audit-log';

export async function POST(request: NextRequest) {
  // Create SSR Supabase client using unified implementation
  const supabase = await createServerSupabaseClient();
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

    // 🔒 セキュリティ: レート制限チェック（IP + メールアドレス）
    try {
      await limitOrThrow('login', request, email);
    } catch (rateLimitError: any) {
      // レート制限超過を監査ログに記録
      await logSecurityEvent({
        type: 'rate_limit',
        outcome: 'fail',
        email,
        ip: request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent'),
        details: { endpoint: '/api/auth/login', limit: 'login' }
      });

      // 429 Too Many Requests を返す
      const response = new NextResponse(
        JSON.stringify({ error: 'Too many login attempts. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60' // 60秒後に再試行
          }
        }
      );
      return response;
    }

    // Supabaseでログイン
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      // ログイン失敗を監査ログに記録
      await logSecurityEvent({
        type: 'login',
        outcome: 'fail',
        email,
        ip: request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        userAgent: request.headers.get('user-agent'),
        details: { reason: authError?.message || 'Invalid credentials' }
      });

      return createApiResponse.error(
        ErrorCodes.INVALID_CREDENTIALS,
        'メールアドレスまたはパスワードが正しくありません'
      );
    }

    // 🔒 セキュリティ: ログイン成功を監査ログに記録
    await logSecurityEvent({
      type: 'login',
      outcome: 'success',
      email: authData.user.email || email,
      ip: request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: request.headers.get('user-agent'),
      details: { userId: authData.user.id }
    });

    // ユーザーのAPIキー情報を取得（Service Roleが設定されている場合のみ）
    // 注: privateスキーマへのアクセスにはService Roleが必要なため、
    // 現在はAPIキー情報の取得をスキップ
    const apiKeys: any[] = [];

    // レスポンスの作成 - SSRクライアントがCookieを自動管理
    return createApiResponse.success({
      message: 'ログインに成功しました',
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || '',
        company: authData.user.user_metadata?.company || null,
        plan: authData.user.user_metadata?.plan || 'beta',
        apiKey: apiKeys.length > 0
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
  // Create SSR Supabase client using unified implementation
  const supabase = await createServerSupabaseClient();

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