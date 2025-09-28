// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';
import { UnifiedApiKeyManager } from '@/lib/api-key/unified-api-key-manager';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch API keys for the user
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, tier, is_active, created_at, last_used_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

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

  } catch (error) {
    console.error('Error in GET /api/keys/manage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, key_name, tier = 'free', key_id } = body;

    const apiKeyManager = new UnifiedApiKeyManager(supabase);

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
        // Fetch API keys for the user
        const { data, error } = await supabase
          .from('api_keys')
          .select('id, name, key_prefix, tier, is_active, created_at, last_used_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

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