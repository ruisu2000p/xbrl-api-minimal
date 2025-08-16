/**
 * APIキー管理エンドポイント
 * POST: 新規APIキー発行
 * GET: 自分のAPIキー一覧取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/app/api/_lib/supabaseAdmin';
import { getCurrentUserId } from '@/app/api/_lib/supabaseAuth';
import { 
  generateApiKey, 
  getKeyPrefix, 
  hashApiKey, 
  maskApiKey,
  calculateExpiryDate 
} from '@/app/api/_lib/apiKey';

/**
 * GET /api/v1/apikeys
 * 自分のAPIキー一覧を取得
 */
export async function GET() {
  try {
    // ユーザー認証
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    // APIキー一覧を取得（ハッシュは含めない）
    const { data, error } = await admin
      .from('api_keys')
      .select('id, name, key_prefix, key_suffix, is_active, status, created_at, last_used_at, expires_at, total_requests, successful_requests, failed_requests')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    // 統計情報を取得
    const { data: stats } = await admin.rpc('get_api_key_stats', { p_user_id: userId });

    return NextResponse.json({
      keys: data || [],
      stats: stats?.[0] || {
        total_keys: 0,
        active_keys: 0,
        revoked_keys: 0,
        total_requests: 0,
        requests_today: 0,
        requests_this_month: 0,
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
 * POST /api/v1/apikeys
 * 新規APIキーを発行
 */
export async function POST(req: NextRequest) {
  try {
    // ユーザー認証
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    // リクエストボディを解析
    const body = await req.json().catch(() => ({}));
    const name = body?.name || 'Claude Desktop';
    const scopes: string[] = body?.scopes || ['read:markdown'];
    const expiresInDays = body?.expires_in_days || 365; // デフォルト1年

    // 既存のAPIキー数をチェック（制限: 10個まで）
    const { count } = await admin
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('revoked', false);

    if ((count || 0) >= 10) {
      return NextResponse.json(
        { error: 'API key limit reached. Please revoke unused keys.' },
        { status: 400 }
      );
    }

    // 新しいAPIキーを生成
    const plainApiKey = generateApiKey();
    const keyHash = hashApiKey(plainApiKey);
    const keyPrefix = getKeyPrefix(plainApiKey);
    const keySuffix = plainApiKey.slice(-4); // 末尾4文字
    const expiresAt = calculateExpiryDate(expiresInDays);

    // データベースに保存（現在のテーブル構造に合わせて修正）
    // user_idがusersテーブルに存在しない場合のフォールバック
    const defaultUserId = 'a0000000-0000-0000-0000-000000000001';
    
    const { data, error } = await admin
      .from('api_keys')
      .insert({
        user_id: userId || defaultUserId,
        name,
        key_prefix: keyPrefix,
        key_suffix: keySuffix,
        key_hash: keyHash,
        is_active: true,
        status: 'active',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        permissions: {
          endpoints: ['*'],
          scopes: scopes,
          rate_limit: 1000
        },
        metadata: {
          created_via: 'api',
          user_agent: req.headers.get('user-agent') || 'unknown'
        },
        created_by: userId,
        tier: 'free',
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, name, key_prefix, key_suffix, created_at, expires_at')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // 成功レスポンス（平文APIキーは一度だけ返す）
    return NextResponse.json(
      {
        id: data.id,
        name: data.name,
        apiKey: plainApiKey, // ⚠️ この値は二度と取得できない
        apiKeyMasked: maskApiKey(plainApiKey),
        prefix: data.key_prefix,
        scopes: data.scopes,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        message: 'Please save this API key securely. You won\'t be able to see it again.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/apikeys
 * 複数のAPIキーを一括削除（失効）
 */
export async function DELETE(req: NextRequest) {
  try {
    // ユーザー認証
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    // リクエストボディからIDリストを取得
    const body = await req.json().catch(() => ({}));
    const ids: string[] = body?.ids || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No API key IDs provided' },
        { status: 400 }
      );
    }

    // 指定されたAPIキーを失効（現在のテーブル構造に対応）
    const { data, error } = await admin
      .from('api_keys')
      .update({ 
        is_active: false,
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: userId,
        revoke_reason: 'User requested revocation'
      })
      .eq('user_id', userId)
      .in('id', ids)
      .select('id');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to revoke API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      revokedCount: data?.length || 0,
      revokedIds: data?.map(k => k.id) || [],
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}