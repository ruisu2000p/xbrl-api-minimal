// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/app/api/_lib/supabaseAdmin';
import { getCurrentUserId } from '@/app/api/_lib/supabaseAuth';
import { randomBytes } from 'crypto';

// APIキーを取得
export async function GET(request: NextRequest) {
  try {
    // 認証を一時的にスキップして、メールベースで処理
    const userEmail = request.headers.get('x-user-email') || 'demo@example.com';
    console.log('Getting API key for email:', userEmail);

    // メールアドレスでプロファイルを検索
    const { data: profile, error } = await admin
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error || !profile) {
      // プロファイルが存在しない場合は作成
      const newApiKey = 'xbrl_live_' + randomBytes(24).toString('hex');
      const { data: newProfile, error: insertError } = await admin
        .from('profiles')
        .insert({
          email: userEmail,
          api_key: newApiKey,
          plan: 'beta'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return NextResponse.json({ success: false, error: 'Failed to create profile: ' + insertError.message }, { status: 500 });
      }

      console.log('Created new profile:', newProfile);
      return NextResponse.json({ apiKey: newApiKey, created: true });
    }

    console.log('Found existing profile:', profile);
    return NextResponse.json({ apiKey: profile.api_key, existing: true });
  } catch (error) {
    console.error('API key fetch error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// 新しいAPIキーを生成
export async function POST(request: NextRequest) {
  try {
    // 認証を一時的にスキップして、メールベースで処理
    const userEmail = request.headers.get('x-user-email') || 'demo@example.com';
    console.log('Generating new API key for email:', userEmail);

    // 新しいAPIキーを生成
    const newApiKey = 'xbrl_live_' + randomBytes(24).toString('hex');

    // まずプロファイルが存在するか確認
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (!existingProfile) {
      // プロファイルが存在しない場合は作成
      const { data: newProfile, error: insertError } = await admin
        .from('profiles')
        .insert({
          email: userEmail,
          api_key: newApiKey,
          plan: 'beta'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return NextResponse.json({ success: false, error: 'Failed to create profile: ' + insertError.message }, { status: 500 });
      }

      console.log('Created new profile with API key:', newProfile);
      return NextResponse.json({ apiKey: newApiKey, created: true });
    }

    // 既存プロファイルのAPIキーを更新
    const { data: updatedProfile, error } = await admin
      .from('profiles')
      .update({ 
        api_key: newApiKey,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail)
      .select()
      .single();

    if (error) {
      console.error('Failed to update API key:', error);
      return NextResponse.json({ success: false, error: 'Failed to update API key: ' + error.message }, { status: 500 });
    }

    // API使用履歴をログ（user_idがある場合のみ）
    if (updatedProfile?.id) {
      await admin
        .from('api_usage')
        .insert({
          user_id: updatedProfile.id,
          endpoint: '/api/dashboard/api-key',
          method: 'POST',
          status_code: 200,
          response_time_ms: 100
        });
    }

    console.log('Updated API key for profile:', updatedProfile);
    return NextResponse.json({ apiKey: newApiKey, updated: true });
  } catch (error) {
    console.error('API key generation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}