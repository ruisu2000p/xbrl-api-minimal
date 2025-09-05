import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/auth/delete-account
 * ユーザーアカウントと関連データを完全に削除（退会処理）
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, confirmText } = body;

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードが必要です' },
        { status: 400 }
      );
    }

    // 削除確認テキストのチェック
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { 
          error: '確認テキストが正しくありません',
          message: '「DELETE MY ACCOUNT」と入力してください'
        },
        { status: 400 }
      );
    }

    // Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. ユーザー認証（本人確認）
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    // Admin clientで削除処理
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 削除するデータの収集
    const deletionReport = {
      userId,
      email,
      deletedAt: new Date().toISOString(),
      deletedData: {
        apiKeys: 0,
        publicUserRecord: false,
        authUserRecord: false
      }
    };

    // 2. APIキーを削除
    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('id, key_prefix, key_suffix')
      .eq('user_id', userId);

    if (apiKeys && apiKeys.length > 0) {
      const { error: deleteKeysError } = await supabaseAdmin
        .from('api_keys')
        .delete()
        .eq('user_id', userId);

      if (deleteKeysError) {
        console.error('Failed to delete API keys:', deleteKeysError);
        return NextResponse.json(
          { 
            error: 'APIキーの削除に失敗しました',
            details: deleteKeysError.message
          },
          { status: 500 }
        );
      }

      deletionReport.deletedData.apiKeys = apiKeys.length;
    }

    // 3. public.usersから削除
    const { error: publicUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (!publicUserError) {
      deletionReport.deletedData.publicUserRecord = true;
    } else if (publicUserError.code !== '23503') {
      // 外部キー制約エラー以外の場合
      console.error('Warning: Failed to delete from public.users:', publicUserError);
    }

    // 4. アクセスログを削除（もしある場合）
    try {
      await supabaseAdmin
        .from('api_access_logs')
        .delete()
        .eq('user_id', userId);
    } catch (err) {
    }

    // 5. auth.usersから削除（最後に実行）
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Failed to delete from auth.users:', authDeleteError);
      return NextResponse.json(
        { 
          error: '認証システムからの削除に失敗しました',
          details: authDeleteError.message,
          partialDeletion: deletionReport
        },
        { status: 500 }
      );
    }

    deletionReport.deletedData.authUserRecord = true;
    // 6. ログアウト処理
    await supabase.auth.signOut();

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'アカウントが正常に削除されました',
      deletionReport,
      farewell: 'ご利用ありがとうございました。またのご利用をお待ちしております。'
    }, { status: 200 });

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { 
        error: 'アカウント削除中にエラーが発生しました',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/delete-account
 * 削除前の確認（削除されるデータのプレビュー）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードが必要です' },
        { status: 400 }
      );
    }

    // Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ユーザー認証
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // Admin clientで情報収集
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 削除されるデータの確認
    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('key_prefix, key_suffix, created_at, last_used_at, total_requests')
      .eq('user_id', userId);

    const deletionPreview = {
      user: {
        id: userId,
        email: authData.user.email,
        createdAt: authData.user.created_at,
        metadata: authData.user.user_metadata
      },
      dataToBeDeleted: {
        apiKeys: apiKeys?.map(k => ({
          key: `${k.key_prefix}...${k.key_suffix}`,
          created: k.created_at,
          lastUsed: k.last_used_at,
          totalRequests: k.total_requests
        })) || [],
        totalApiKeys: apiKeys?.length || 0,
        accountAge: calculateAccountAge(authData.user.created_at)
      },
      warning: '⚠️ この操作は取り消せません。すべてのデータが完全に削除されます。',
      confirmationRequired: 'DELETE MY ACCOUNT'
    };

    return NextResponse.json(deletionPreview, { status: 200 });

  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'プレビューの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// アカウント年齢を計算
function calculateAccountAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return '1日未満';
  if (diffDays < 30) return `${diffDays}日`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月`;
  return `${Math.floor(diffDays / 365)}年`;
}