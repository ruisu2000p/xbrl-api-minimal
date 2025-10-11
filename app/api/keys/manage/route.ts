// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';

export async function GET(request: NextRequest) {
  try {
    // Health check - returns version info without auth
    const url = new URL(request.url);
    if (url.searchParams.get('health') === 'true') {
      return NextResponse.json({
        status: 'ok',
        version: '2.2.0', // Fix for API key deletion
        timestamp: new Date().toISOString()
      });
    }

    // Log environment setup
    console.log('API Keys GET endpoint called');
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    });

    let supabase;
    try {
      supabase = await createServerSupabaseClient();
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError);
      return NextResponse.json(
        {
          error: 'Failed to initialize client',
          details: clientError instanceof Error ? clientError.message : String(clientError)
        },
        { status: 500 }
      );
    }

    // Try to get the token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let user = null;
    let authError = null;

    console.log('Auth header present:', !!authHeader);

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Using Bearer token auth');
      const { data, error } = await supabase.auth.getUser(token);
      user = data?.user;
      authError = error;
    } else {
      // Fallback to session-based auth
      console.log('Using session-based auth');
      const { data, error } = await supabase.auth.getUser();
      user = data?.user;
      authError = error;
    }

    console.log('Auth result:', {
      hasUser: !!user,
      authError: authError?.message,
      userId: user?.id
    });

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    // Edge Functionを呼び出してAPIキー一覧を取得
    console.log('Fetching API keys for user:', user.id);

    const { data: result, error: fetchError } = await supabase.functions.invoke('api-key-manager', {
      body: {
        action: 'list'
      }
    });

    if (fetchError || !result?.success) {
      console.error('Error fetching API keys:', fetchError);
      return NextResponse.json({
        success: true,
        keys: []
      });
    }

    console.log('Fetch result:', {
      hasData: true,
      dataCount: result.keys?.length || 0
    });

    return NextResponse.json({
      success: true,
      keys: result.keys || []
    });

  } catch (error) {
    console.error('Error in GET /api/keys/manage:', error);

    // More detailed error message in non-production
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV !== 'production' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use regular client for authentication
    const authClient = await createServerSupabaseClient();

    // Get current user
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, key_name, tier = 'free', key_id } = body;

    // Handle different actions
    switch (action) {
      case 'create':
      case 'rotate': {
        if (!key_name) {
          return NextResponse.json(
            { error: 'key_name is required' },
            { status: 400 }
          );
        }

        console.log('Attempting to generate API key for user:', user.id);

        // Edge Functionを呼び出してAPIキーを生成
        const { data: result, error: createError } = await authClient.functions.invoke('api-key-manager', {
          body: {
            action: 'rotate',
            key_name: key_name,
            tier: tier || 'free'
          }
        });

        if (createError || !result?.success) {
          console.error('Failed to create API key:', createError);
          return NextResponse.json(
            { error: 'APIキーの作成に失敗しました' },
            { status: 500 }
          );
        }

        console.log('API key generated successfully:', {
          keyId: result.keyId,
          success: result.success
        });

        return NextResponse.json({
          success: true,
          newKey: result.apiKey,  // フロントエンドが期待するフィールド名
          apiKey: result.apiKey,  // 後方互換性のため
          key_id: result.keyId,
          keyId: result.keyId,    // 後方互換性のため
          name: result.name || key_name,
          tier: result.tier || tier,
          message: 'このAPIキーは一度だけ表示されます。安全な場所に保管してください。'
        });
      }

      case 'delete':
      case 'revoke': {
        if (!key_id) {
          return NextResponse.json(
            { error: 'key_id is required' },
            { status: 400 }
          );
        }

        console.log('Attempting to delete API key:', key_id);

        // Edge Functionを呼び出してAPIキーを削除
        const { data: result, error: deleteError } = await authClient.functions.invoke('api-key-manager', {
          body: {
            action: 'delete',
            key_id: key_id
          }
        });

        if (deleteError || !result?.success) {
          console.error('Failed to revoke API key:', deleteError);
          return NextResponse.json(
            { error: 'APIキーの無効化に失敗しました' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'APIキーが正常に削除されました'
        });
      }

      case 'list':
      default: {
        // Edge Functionを呼び出してAPIキー一覧を取得
        const { data: result, error: listError } = await authClient.functions.invoke('api-key-manager', {
          body: {
            action: 'list'
          }
        });

        if (listError || !result?.success) {
          console.error('Error fetching API keys:', listError);
          return NextResponse.json({
            success: true,
            keys: []
          });
        }

        return NextResponse.json({
          success: true,
          keys: result.keys || []
        });
      }
    }

  } catch (error) {
    console.error('Error in POST /api/keys/manage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
