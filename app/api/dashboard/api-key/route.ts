import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/app/api/_lib/supabaseAdmin';
import { getCurrentUserId } from '@/app/api/_lib/supabaseAuth';
import { randomBytes } from 'crypto';

// APIキーを取得
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      // デモユーザーの場合
      return NextResponse.json({
        apiKey: 'xbrl_demo_' + randomBytes(16).toString('hex'),
        isDemo: true
      });
    }

    // Supabaseからユーザープロファイルを取得
    const { data: profile, error } = await admin
      .from('profiles')
      .select('api_key')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      // プロファイルが存在しない場合は作成
      const newApiKey = 'xbrl_live_' + randomBytes(24).toString('hex');
      const { error: insertError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email: 'user@example.com', // 実際のemailはauth.usersから取得可能
          api_key: newApiKey,
          plan: 'beta'
        });

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      return NextResponse.json({ apiKey: newApiKey });
    }

    return NextResponse.json({ apiKey: profile.api_key });
  } catch (error) {
    console.error('API key fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 新しいAPIキーを生成
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      // デモユーザーの場合
      const demoKey = 'xbrl_demo_' + randomBytes(16).toString('hex');
      return NextResponse.json({ apiKey: demoKey, isDemo: true });
    }

    // 新しいAPIキーを生成
    const newApiKey = 'xbrl_live_' + randomBytes(24).toString('hex');

    // Supabaseのプロファイルを更新
    const { error } = await admin
      .from('profiles')
      .update({ api_key: newApiKey })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update API key:', error);
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }

    // API使用履歴をログ
    await admin
      .from('api_usage')
      .insert({
        user_id: userId,
        endpoint: '/api/dashboard/api-key',
        method: 'POST',
        status_code: 200,
        response_time_ms: 100
      });

    return NextResponse.json({ apiKey: newApiKey });
  } catch (error) {
    console.error('API key generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}