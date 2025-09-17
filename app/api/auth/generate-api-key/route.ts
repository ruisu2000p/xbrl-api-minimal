// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// APIキー生成専用エンドポイント
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateApiKey,
  hashApiKey,
  extractApiKeyPrefix,
  extractApiKeySuffix,
  maskApiKey
} from '@/lib/security/apiKey';

// Supabase環境変数を関数内で取得
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
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
    // 認証チェック: Authorizationヘッダーが必須
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const body = await request.json();
    const { userId, email, plan = 'beta' } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'ユーザー情報が不足しています' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase接続エラー: 環境変数が設定されていません' },
        { status: 500 }
      );
    }

    // トークンを検証してユーザーを確認
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // リクエストのuserIdが認証されたユーザーと一致することを確認
    if (user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: User ID mismatch' },
        { status: 403 }
      );
    }

    // 既存のアクティブなAPIキーを確認
    const { data: existingKeys, error: fetchError } = await supabaseAdmin
      .from('api_keys')
      .select('id, key_prefix, created_at')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Fetch API keys error:', fetchError);
    }

    // 既にAPIキーがある場合は新規作成しない
    if (existingKeys && existingKeys.length > 0) {
      return NextResponse.json({
        success: false,
        message: '既にAPIキーが存在します',
        hasExistingKey: true,
        keyInfo: {
          prefix: existingKeys[0].key_prefix,
          createdAt: existingKeys[0].created_at
        }
      }, { status: 200 });
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
      console.error('API key creation error:', apiKeyError);
      
      // エラーの詳細を返す
      return NextResponse.json({
        success: false,
        error: 'APIキーの作成に失敗しました',
        details: apiKeyError.message,
        code: apiKeyError.code
      }, { status: 500 });
    }

    console.log('✅ API key generated successfully:', {
      email,
      userId,
      keyPrefix
    });

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'APIキーが正常に生成されました',
      apiKey, // 平文のAPIキー（初回のみ）
      keyInfo: {
        prefix: keyPrefix,
        suffix: keySuffix,
        masked: maskApiKey(apiKey),
        createdAt: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Generate API key error:', error);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// APIキー情報の取得（デバッグ用）
export async function GET(request: NextRequest) {
  // 認証チェック: Authorizationヘッダーが必須
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'ユーザーIDが必要です' },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Supabase接続エラー' },
      { status: 500 }
    );
  }

  // トークンを検証してユーザーを確認
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user || user.id !== userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ユーザーのAPIキー情報を取得
  const { data: apiKeys, error } = await supabaseAdmin
    .from('api_keys')
    .select('key_prefix, key_suffix, name, is_active, created_at, expires_at, rate_limit_per_day')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    return NextResponse.json(
      { success: false, error: 'APIキー情報の取得に失敗しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    hasApiKey: apiKeys && apiKeys.length > 0,
    apiKeys: apiKeys?.map(k => ({
      display: `${k.key_prefix}...${k.key_suffix}`,
      name: k.name,
      active: k.is_active,
      createdAt: k.created_at,
      expiresAt: k.expires_at,
      rateLimit: k.rate_limit_per_day
    }))
  }, { status: 200 });
}