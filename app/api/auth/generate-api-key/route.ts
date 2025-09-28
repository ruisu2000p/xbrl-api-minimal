// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// APIキー生成専用エンドポイント
import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, ErrorCodes } from '@/lib/utils/api-response-v2';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';
import { generateApiKey as generateApiKeyRPC, getMyApiKeys as getMyApiKeysRPC } from '@/lib/supabase/rpc-client';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = 'API Key', tier = 'free' } = body;

    // Supabaseクライアント作成（認証確認）
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createApiResponse.unauthorized('Authentication required');
    }

    // 既存のAPIキーを確認（RPC関数を使用）
    const existingKeysResult = await supabase.rpc('get_my_api_keys');

    if (existingKeysResult.data?.data && existingKeysResult.data.data.length > 0) {
      const existingKey = existingKeysResult.data.data[0];
      return createApiResponse.success({
        message: '既にAPIキーが存在します',
        hasExistingKey: true,
        keyInfo: {
          masked_key: existingKey.masked_key,
          createdAt: existingKey.created_at
        }
      });
    }

    // 新しいAPIキーを生成（RPC関数を使用）
    const { data: generateResult, error: generateError } = await supabase.rpc('generate_my_api_key', {
      p_name: name,
      p_tier: tier
    });

    if (generateError || !generateResult?.success) {
      return createApiResponse.internalError(
        generateError || new Error(generateResult?.error || 'Failed to generate API key'),
        'APIキーの作成に失敗しました'
      );
    }

    const apiKeyData = generateResult.data;

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API key generated successfully');
    }

    // 成功レスポンス（201 Createdステータス）
    return NextResponse.json({
      success: true,
      data: {
        message: 'APIキーが正常に生成されました',
        apiKey: apiKeyData.api_key, // 平文のAPIキー（初回のみ）
        keyInfo: {
          masked: apiKeyData.masked_key,
          name: apiKeyData.name,
          tier: apiKeyData.tier,
          createdAt: apiKeyData.created_at
        }
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

// APIキー情報の取得
export async function GET(request: NextRequest) {
  try {
    // Supabaseクライアント作成（認証確認）
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createApiResponse.unauthorized('Authentication required');
    }

    // APIキー情報を取得（RPC関数を使用）
    const { data: apiKeysResult, error } = await supabase.rpc('get_my_api_keys');

    if (error || !apiKeysResult?.success) {
      return createApiResponse.internalError(
        error || new Error(apiKeysResult?.error || 'Failed to fetch API keys'),
        'APIキー情報の取得に失敗しました'
      );
    }

    const apiKeys = apiKeysResult.data || [];

    return createApiResponse.success({
      hasApiKey: apiKeys.length > 0,
      apiKeys: apiKeys.map((k: any) => ({
        display: k.masked_key,
        name: k.name,
        tier: k.tier,
        active: k.is_active,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at
      }))
    });
  } catch (error) {
    return createApiResponse.internalError(
      error,
      'サーバーエラーが発生しました'
    );
  }
}