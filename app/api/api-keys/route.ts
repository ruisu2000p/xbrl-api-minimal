import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/api-keys - APIキー一覧を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 現在のユーザー情報を取得（ダミー）
    // 実際にはセッションから取得する必要があります
    const userId = 'demo-user';

    // APIキーをデータベースから取得
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, tier, is_active, created_at, last_used_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      apiKeys: apiKeys || []
    });
  } catch (error) {
    console.error('API keys fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - 新しいAPIキーを作成
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 現在のユーザー情報を取得（ダミー）
    const userId = 'demo-user';

    // APIキーを生成（32文字のランダム文字列）
    const randomString = Array.from({ length: 32 }, () =>
      Math.random().toString(36)[2] || '0'
    ).join('');
    const apiKey = `xbrl_v1_${randomString}`;
    const keyPrefix = `xbrl_v1_${randomString.substring(0, 4)}`;

    // bcryptでハッシュ化（簡易実装 - 実際にはbcryptライブラリを使用）
    const keyHash = apiKey; // TODO: 実際にはbcryptでハッシュ化が必要

    // データベースに保存
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        user_id: userId,
        tier: 'free',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      apiKey: {
        ...data,
        full_key: apiKey // 初回のみ完全なキーを返す
      }
    });
  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys/[id] - APIキーを削除
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const keyId = pathParts[pathParts.length - 1];

    if (!keyId) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // APIキーを無効化（削除ではなく無効化）
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}