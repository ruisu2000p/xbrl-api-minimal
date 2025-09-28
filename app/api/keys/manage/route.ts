// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/utils/supabase/unified-client';
import { UnifiedApiKeyManager } from '@/lib/api-key/unified-api-key-manager';

export async function GET(request: NextRequest) {
  try {
    // Log environment setup
    console.log('API Keys GET endpoint called');
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    });

    const supabase = await createServerSupabaseClient();

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

    // Fetch API keys for the user using RPC function
    console.log('Fetching API keys for user:', user.id);

    const { data, error } = await supabase
      .rpc('get_user_api_keys', { p_user_id: user.id });

    console.log('Fetch result:', {
      hasData: !!data,
      dataCount: data?.length,
      error: error?.message
    });

    if (error) {
      console.error('Failed to fetch API keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keys: data || []
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

    // Use service role client for API key operations (private schema access)
    const serviceClient = await createServiceSupabaseClient();
    if (!serviceClient) {
      console.error('Service role client not available');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    const apiKeyManager = new UnifiedApiKeyManager(serviceClient);

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

        // Generate new API key
        const result = await apiKeyManager.generateApiKey(user.id, key_name, 30);

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to generate API key' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          apiKey: result.apiKey,
          keyId: result.keyId,
          name: key_name,
          tier: tier,
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

        const success = await apiKeyManager.revokeApiKey(key_id, user.id);

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to revoke API key' },
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
        // Fetch API keys for the user using RPC function
        const { data, error } = await authClient
          .rpc('get_user_api_keys', { p_user_id: user.id });

        if (error) {
          console.error('Failed to fetch API keys:', error);
          return NextResponse.json(
            { error: 'Failed to fetch API keys' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          keys: data || []
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