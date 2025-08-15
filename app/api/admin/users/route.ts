import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 管理者認証チェック
async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  
  try {
    // トークンからユーザー情報を取得
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return false;

    // ユーザーのロールを確認
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    return userData?.role === 'admin';
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 管理者認証
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const search = searchParams.get('search');
    const plan = searchParams.get('plan');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sort_by') || 'join_date';
    const order = searchParams.get('order') || 'desc';

    // クエリ構築
    let query = supabase
      .from('user_statistics')
      .select('*', { count: 'exact' });

    // フィルタリング
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }
    
    if (plan && plan !== 'all') {
      query = query.eq('subscription_plan', plan);
    }
    
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // ソート
    query = query.order(sortBy, { ascending: order === 'asc' });

    // ページネーション
    const startIndex = (page - 1) * perPage;
    query = query.range(startIndex, startIndex + perPage - 1);

    const { data: users, error, count } = await query;

    if (error) {
      throw error;
    }

    // 統計情報を取得
    const { data: stats } = await supabase
      .from('users')
      .select('subscription_plan')
      .eq('is_active', true);

    const planCounts = {
      free: 0,
      standard: 0,
      pro: 0
    };

    stats?.forEach(user => {
      if (user.subscription_plan in planCounts) {
        planCounts[user.subscription_plan as keyof typeof planCounts]++;
      }
    });

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
      statistics: {
        total_users: count || 0,
        active_users: stats?.length || 0,
        plan_distribution: planCounts
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ユーザー情報更新
export async function PATCH(request: NextRequest) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, updates } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 許可される更新フィールド
    const allowedFields = [
      'subscription_plan',
      'is_active',
      'suspension_reason',
      'notes',
      'monthly_api_calls'
    ];

    const filteredUpdates: any = {};
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // ユーザー情報を更新
    const { data, error } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', user_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 管理者アクティビティログを記録
    await supabase
      .from('admin_activity_logs')
      .insert({
        action_type: 'user_update',
        target_user_id: user_id,
        description: `Updated user: ${Object.keys(filteredUpdates).join(', ')}`,
        metadata: { updates: filteredUpdates }
      });

    return NextResponse.json({
      success: true,
      user: data
    }, {
      status: 200
    });

  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}