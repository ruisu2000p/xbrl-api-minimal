import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/app/api/_lib/supabaseAdmin';
import { getCurrentUserId, getCurrentUser } from '@/app/api/_lib/supabaseAuth';

// ユーザープロファイルを取得
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      // デモユーザーの場合
      return NextResponse.json({
        user: {
          id: 'demo',
          email: 'demo@example.com',
          plan: 'beta',
          createdAt: new Date().toISOString()
        },
        isDemo: true
      });
    }

    // 認証ユーザー情報を取得
    const authUser = await getCurrentUser();
    
    // Supabaseからプロファイルを取得
    const { data: profile, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      // プロファイルが存在しない場合は作成
      const newProfile = {
        id: userId,
        email: authUser?.email || 'user@example.com',
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