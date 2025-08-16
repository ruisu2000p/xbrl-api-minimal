/**
 * 個別APIキー管理エンドポイント
 * DELETE: APIキーを失効
 * PATCH: APIキー情報を更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/app/api/_lib/supabaseAdmin';
import { getCurrentUserId } from '@/app/api/_lib/supabaseAuth';

interface Params {
  params: {
    id: string;
  };
}

/**
 * DELETE /api/v1/apikeys/[id]
 * 指定したAPIキーを失効
 */
export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    // ユーザー認証
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    const keyId = params.id;

    // APIキーを失効（削除ではなく revoked フラグを立てる）
    const { data, error } = await admin
      .from('api_keys')
      .update({ revoked: true })
      .eq('id', keyId)
      .eq('user_id', userId)
      .select('id, name')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'API key not found or already revoked' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'API key revoked successfully',
      revokedKey: {
        id: data.id,
        name: data.name,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/apikeys/[id]
 * APIキー情報を更新（名前、スコープなど）
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // ユーザー認証
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    const keyId = params.id;
    const body = await req.json().catch(() => ({}));

    // 更新可能なフィールドのみ抽出
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.scopes !== undefined) updates.scopes = body.scopes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // APIキー情報を更新
    const { data, error } = await admin
      .from('api_keys')
      .update(updates)
      .eq('id', keyId)
      .eq('user_id', userId)
      .eq('revoked', false) // 失効済みは更新不可
      .select('id, name, key_prefix, scopes, created_at, last_used_at, expires_at')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'API key not found or revoked' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'API key updated successfully',
      key: data,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/apikeys/[id]
 * 指定したAPIキーの詳細情報を取得
 */
export async function GET(_: NextRequest, { params }: Params) {
  try {
    // ユーザー認証
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    const keyId = params.id;

    // APIキー情報を取得
    const { data, error } = await admin
      .from('api_keys')
      .select('id, name, key_prefix, scopes, revoked, created_at, last_used_at, expires_at')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // 最近のアクセスログを取得
    const { data: recentLogs } = await admin
      .from('api_access_logs')
      .select('endpoint, method, status_code, created_at')
      .eq('api_key_id', keyId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      key: data,
      recentActivity: recentLogs || [],
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}