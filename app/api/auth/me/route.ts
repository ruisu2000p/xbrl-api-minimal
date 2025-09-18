// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 現在のユーザー情報を取得
 * GET /api/auth/me
 */

import { NextResponse } from 'next/server';
import { supabaseManager } from '@/lib/infrastructure/supabase-manager';

export async function GET() {
  try {
    const supabase = await supabaseManager.createSSRClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}