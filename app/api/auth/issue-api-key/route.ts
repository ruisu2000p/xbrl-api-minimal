// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import {
  generateApiKey,
  hashApiKey,
  extractApiKeyPrefix,
  extractApiKeySuffix,
  maskApiKey
} from '@/lib/security/apiKey';
import { createApiResponse, ErrorCodes } from '@/lib/utils/api-response-v2';
import { supabaseManager } from '@/lib/infrastructure/supabase-manager';

/**
 * POST /api/auth/issue-api-key
 * ログイン済みユーザーのAPIキーを発行
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック: Authorizationヘッダーが必須
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiResponse.unauthorized('Authentication required');
    }

    const token = authHeader.substring(7);

    const body = await request.json();
    const { email, userId, keyName } = body;

    // バリデーション
    if (!email || !userId) {
      return createApiResponse.error(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        'メールアドレスとユーザーIDが必要です'
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = supabaseManager.createTemporaryAdminClient();
    if (!supabaseAdmin) {
      return createApiResponse.internalError(
        new Error('Admin client not available'),
        'Server configuration error'
      );
    }

    // トークンを検証してユーザーを確認
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return createApiResponse.unauthorized('Invalid token');
    }

    // リクエストのuserId/emailが認証されたユーザーと一致することを確認
    if (user.id !== userId || user.email !== email) {
      return createApiResponse.forbidden('User mismatch');
    }

    // 既存のAPIキー数を確認
    const { data: existingKeys, count } = await supabaseAdmin
      .from('api_keys')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true);

    if ((count || 0) >= 5) {
      return createApiResponse.error(
        ErrorCodes.VALIDATION_ERROR,
        'APIキーの上限に達しています',
        { limit: '1アカウントにつき最大5個まで' }
      );
    }

    // 新しいAPIキーを生成
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);
    const keyPrefix = extractApiKeyPrefix(apiKey);
    const keySuffix = extractApiKeySuffix(apiKey);

    // ユーザーのプランを取得
    const userPlan = user.user_metadata?.plan || 'free';

    // APIキーをデータベースに保存（存在するカラムのみ使用）
    const { data: savedKey, error: saveError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: userId,
        name: keyName || `API Key #${(count || 0) + 1}`,
        key_prefix: keyPrefix,
        key_suffix: keySuffix,
        key_hash: keyHash,
        is_active: true,
        status: 'active',
        tier: userPlan === 'pro' ? 'pro' : userPlan === 'basic' ? 'basic' : 'free',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        // Rate limitsはテーブル定義に従って設定
        rate_limit_per_minute: userPlan === 'pro' ? 200 : userPlan === 'basic' ? 100 : 60,
        rate_limit_per_hour: userPlan === 'pro' ? 10000 : userPlan === 'basic' ? 5000 : 1000,
        rate_limit_per_day: userPlan === 'pro' ? 100000 : userPlan === 'basic' ? 50000 : 10000
      })
      .select()
      .single();

    if (saveError) {
      return createApiResponse.internalError(
        saveError,
        'APIキーの保存に失敗しました'
      );
    }

    // 成功レスポンス
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API key issued successfully:', { keyId: savedKey.id });
    }

    // 成功レスポンス（201 Createdステータス）
    return NextResponse.json({
      success: true,
      data: {
        message: 'APIキーが正常に発行されました',
        apiKey: {
          key: apiKey, // この値は一度だけ表示される
          displayKey: maskApiKey(apiKey),
          id: savedKey.id,
          name: savedKey.name,
          createdAt: savedKey.created_at,
          expiresAt: savedKey.expires_at
        },
        user: {
          email,
          userId,
          plan: userPlan
        },
        warning: 'このAPIキーは二度と表示されません。安全な場所に保管してください。'
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    return createApiResponse.internalError(
      error,
      'サーバーエラーが発生しました'
    );
  }
}

/**
 * GET /api/auth/issue-api-key
 * ユーザーの既存APIキー一覧を取得
 */
export async function GET(request: NextRequest) {
  // 認証チェック: Authorizationヘッダーが必須
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createApiResponse.unauthorized('Authentication required');
  }

  const token = authHeader.substring(7);
  const email = request.nextUrl.searchParams.get('email');
  const userId = request.nextUrl.searchParams.get('userId');

  if (!email || !userId) {
    return createApiResponse.error(
      ErrorCodes.MISSING_REQUIRED_FIELD,
      'メールアドレスとユーザーIDが必要です'
    );
  }

  try {
    const supabaseAdmin = supabaseManager.createTemporaryAdminClient();
    if (!supabaseAdmin) {
      return createApiResponse.internalError(
        new Error('Admin client not available'),
        'Server configuration error'
      );
    }

    // トークンを検証してユーザーを確認
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user || user.id !== userId || user.email !== email) {
      return createApiResponse.unauthorized();
    }

    // APIキー一覧を取得
    const { data: apiKeys, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, key_suffix, is_active, created_at, last_used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return createApiResponse.internalError(
        error,
        'APIキーの取得に失敗しました'
      );
    }

    return createApiResponse.success({
      email,
      userId,
      apiKeys: apiKeys?.map(k => ({
        id: k.id,
        name: k.name,
        displayKey: `${k.key_prefix}...${k.key_suffix}`,
        active: k.is_active,
        createdAt: k.created_at,
        lastUsed: k.last_used_at
      })) || [],
      total: apiKeys?.length || 0
    });

  } catch (error) {
    return createApiResponse.internalError(
      error,
      'サーバーエラーが発生しました'
    );
  }
}