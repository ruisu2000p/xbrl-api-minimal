// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/app/api/_lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const adminKey = req.headers.get('X-Admin-Key');
    if (adminKey !== 'admin2025xbrl') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get admin client
    let admin: any;
    try {
      admin = getAdminClient();
    } catch (error) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { data: authData } = await admin.auth.admin.listUsers();
    
    const usersWithKeys = await Promise.all(
      (authData.users || []).map(async (user: any) => {
        const { data: apiKeys } = await admin
          .from('api_keys')
          .select('id, name, key_prefix, scopes, revoked, created_at, last_used_at')
          .eq('user_id', user.id);

        return {
          user_id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          api_keys: apiKeys || [],
        };
      })
    );

    return NextResponse.json({ users: usersWithKeys });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
