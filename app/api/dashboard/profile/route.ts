import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/app/api/_lib/supabaseAdmin';
import { getCurrentUserId, getCurrentUser } from '@/app/api/_lib/supabaseAuth';

// ユーザープロファイルを取得
export async function GET(request: NextRequest) {
  try {
    // メールアドレスベースで処理
    const userEmail = request.headers.get('x-user-email') || 'demo@example.com';
    console.log('Getting profile for email:', userEmail);

    // Supabaseからプロファイルを取得
    const { data: profile, error } = await admin
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (error || !profile) {
      // プロファイルが存在しない場合は作成
      const newProfile = {
        email: userEmail,
        plan: 'beta',
        api_key: 'xbrl_live_' + Math.random().toString(36).substring(2, 15)
      };

      const { error: insertError } = await admin
        .from('profiles')
        .insert(newProfile);

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      return NextResponse.json({
        user: {
          id: newProfile.id,
          email: newProfile.email,
          plan: newProfile.plan,
          createdAt: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        plan: profile.plan,
        createdAt: profile.created_at
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}