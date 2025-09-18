// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// APIキー生成専用エンドポイント
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


export async function POST(request: NextRequest) {
  try {
    // 認証チェック: Authorizationヘッダーが必須
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiResponse.unauthorized('Authentication required');
    }

    const token = authHeader.substring(7);

    const body = await request.json();
    const { userId, email, plan = 'beta' } = body;

    if (!userId || !email) {
      return createApiResponse.error(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        'ユーザー情報が不足しています'
      );
    }

    let supabaseAdmin;
    try {
      supabaseAdmin = supabaseManager.createTemporaryAdminClient();
    } catch (error) {
      return createApiResponse.internalError(
        error,
        'Supabase接続エラー'
      );
    }

    // トークンを検証してユーザーを確認
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return createApiResponse.unauthorized('Invalid token');
    }

    // リクエストのuserIdが認証されたユーザーと一致することを確認
    if (user.id !== userId) {
      return createApiResponse.forbidden('User ID mismatch');
    }

    // 既存のアクティブなAPIキーを確認
    const { data: existingKeys, error: fetchError } = await supabaseAdmin
      .from('api_keys')
      .select('id, key_prefix, created_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    // エラーはログに記録しない（機密情報保護）

    // 既にAPIキーがある場合は新規作成しない
    if (existingKeys && existingKeys.length > 0) {
      return createApiResponse.success({
        message: '既にAPIキーが存在します',
        hasExistingKey: true,
        keyInfo: {
          prefix: existingKeys[0].key_prefix,
          createdAt: existingKeys[0].created_at
        }
      });
    }

    // 新しいAPIキーを生成
    const apiKey = generateApiKey('xbrl_live');
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = extractApiKeyPrefix(apiKey);
    const keySuffix = extractApiKeySuffix(apiKey);

    // APIキーをデータベースに保存（nameカラムも含める）
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
      return createApiResponse.internalError(
        apiKeyError,
        'APIキーの作成に失敗しました'
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API key generated successfully');
    }

    // 成功レスポンス
    const response = createApiResponse.success({
      message: 'APIキーが正常に生成されました',
      apiKey, // 平文のAPIキー（初回のみ）
      keyInfo: {
        prefix: keyPrefix,
        suffix: keySuffix,
        masked: maskApiKey(apiKey),
        createdAt: new Date().toISOString()
      }
    });
    // 201 Created status for POST
    response.status = 201;
    return response;

  } catch (error) {
    return createApiResponse.internalError(
      error,
      'サーバーエラーが発生しました'
    );
  }
}

// APIキー情報の取得（デバッグ用）
export async function GET(request: NextRequest) {
  // 認証チェック: Authorizationヘッダーが必須
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createApiResponse.unauthorized('Authentication required');
  }

  const token = authHeader.substring(7);
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return createApiResponse.error(
      ErrorCodes.MISSING_REQUIRED_FIELD,
      'ユーザーIDが必要です'
    );
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = supabaseManager.createTemporaryAdminClient();
  } catch (error) {
    return createApiResponse.internalError(
      error,
      'Supabase接続エラー'
    );
  }

  // トークンを検証してユーザーを確認
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user || user.id !== userId) {
    return createApiResponse.unauthorized();
  }

  // ユーザーのAPIキー情報を取得
  const { data: apiKeys, error } = await supabaseAdmin
    .from('api_keys')
    .select('key_prefix, key_suffix, name, is_active, created_at, expires_at, rate_limit_per_day')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    return createApiResponse.internalError(
      error,
      'APIキー情報の取得に失敗しました'
    );
  }

  return createApiResponse.success({
    hasApiKey: apiKeys && apiKeys.length > 0,
    apiKeys: apiKeys?.map(k => ({
      display: `${k.key_prefix}...${k.key_suffix}`,
      name: k.name,
      active: k.is_active,
      createdAt: k.created_at,
      expiresAt: k.expires_at,
      rateLimit: k.rate_limit_per_day
    }))
  });
}