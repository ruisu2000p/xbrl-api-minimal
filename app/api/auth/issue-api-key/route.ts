// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateApiKey,
  hashApiKey,
  extractApiKeyPrefix,
  extractApiKeySuffix,
  maskApiKey
} from '@/lib/security/apiKey';

/**
 * POST /api/auth/issue-api-key
 * ログイン済みユーザーのAPIキーを発行
 */
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
    const { email, userId, keyName } = body;

    // バリデーション
    if (!email || !userId) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスとユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Create Supabase admin client inside the function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    // トークンを検証してユーザーを確認
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // リクエストのuserId/emailが認証されたユーザーと一致することを確認
    if (user.id !== userId || user.email !== email) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: User mismatch' },
        { status: 403 }
      );
    }

    // 既存のAPIキー数を確認
    const { data: existingKeys, count } = await supabaseAdmin
      .from('api_keys')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true);

    if ((count || 0) >= 5) {
      return NextResponse.json(
        { 
          error: 'APIキーの上限に達しています',
          message: '1アカウントにつき最大5個までのAPIキーを発行できます'
        },
        { status: 400 }
      );
    }

    // 新しいAPIキーを生成
    const apiKey = generateApiKey('xbrl_live');
    const keyHash = hashApiKey(apiKey);
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
      console.error('API key save error:', saveError);
      return NextResponse.json(
        { 
          error: 'APIキーの保存に失敗しました',
          details: saveError.message
        },
        { status: 500 }
      );
    }

    // 成功レスポンス
    console.log('✅ API key issued successfully:', {
      email,
      userId,
      keyPrefix,
      keyId: savedKey.id
    });

    return NextResponse.json({
      success: true,
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
    }, { status: 201 });

  } catch (error) {
    console.error('API key issue error:', error);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const email = request.nextUrl.searchParams.get('email');
  const userId = request.nextUrl.searchParams.get('userId');

  if (!email || !userId) {
    return NextResponse.json(
      { success: false, error: 'メールアドレスとユーザーIDが必要です' },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // トークンを検証してユーザーを確認
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user || user.id !== userId || user.email !== email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // APIキー一覧を取得
    const { data: apiKeys, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, key_suffix, is_active, created_at, last_used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'APIキーの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
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
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}