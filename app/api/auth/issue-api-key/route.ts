// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { maskApiKey } from '@/lib/security/apiKey';
import { UnifiedAuthManager } from '@/lib/security/auth-manager';

/**
 * POST /api/auth/issue-api-key
 * ログイン済みユーザーのAPIキーを発行
 */
export async function POST(request: NextRequest) {
  try {
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

    // ユーザー確認
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.id === userId && u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
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

    // ユーザーのプランを取得
    const userPlan = user.user_metadata?.plan || 'free';

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const { apiKey, record } = await UnifiedAuthManager.createApiKey(
      userId,
      keyName || `API Key #${(count || 0) + 1}`,
      {
        tier: userPlan === 'pro' ? 'pro' : userPlan === 'basic' ? 'basic' : 'free',
        status: 'active',
        expiresAt,
        metadata: {
          created_via: 'api_endpoint',
          user_email: email,
          plan: userPlan,
          created_at: new Date().toISOString()
        },
        rateLimits: {
          perMinute: userPlan === 'pro' ? 200 : userPlan === 'basic' ? 120 : 60,
          perHour: userPlan === 'pro' ? 5000 : userPlan === 'basic' ? 2500 : 1000,
          perDay: userPlan === 'pro' ? 100000 : userPlan === 'basic' ? 50000 : 10000
        },
        extraFields: {
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
          permissions: {
            endpoints: ['*'],
            scopes: ['read:markdown', 'read:companies', 'read:documents'],
            rate_limit: userPlan === 'pro' ? 10000 : userPlan === 'basic' ? 5000 : 1000
          },
          created_by: userId,
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0
        }
      }
    );

    // 成功レスポンス
    console.log('✅ API key issued successfully:', {
      email,
      userId,
      keyPrefix: record.key_prefix,
      keyId: record.id
    });

    return NextResponse.json({
      success: true,
      message: 'APIキーが正常に発行されました',
      apiKey: {
        key: apiKey, // この値は一度だけ表示される
        displayKey: maskApiKey(apiKey),
        id: record.id,
        name: record.name,
        createdAt: record.created_at,
        expiresAt: record.expires_at
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