// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '7d';
    
    // 期間設定
    let dateFilter = new Date();
    switch(period) {
      case '1d':
        dateFilter.setDate(dateFilter.getDate() - 1);
        break;
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      case '90d':
        dateFilter.setDate(dateFilter.getDate() - 90);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 7);
    }

    // 総ユーザー数
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // アクティブユーザー数
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 今日の新規ユーザー
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: newUsersToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('join_date', today.toISOString());

    // プラン別ユーザー数
    const { data: planDistribution } = await supabase
      .from('users')
      .select('subscription_plan')
      .eq('is_active', true);

    const planCounts = {
      free: 0,
      standard: 0,
      pro: 0
    };

    planDistribution?.forEach(user => {
      if (user.subscription_plan in planCounts) {
        planCounts[user.subscription_plan as keyof typeof planCounts]++;
      }
    });

    // 月間収益計算
    const monthlyRevenue = 
      planCounts.pro * 2980 + 
      planCounts.standard * 1080;

    // API使用統計
    const { count: apiCallsToday } = await supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { data: apiEndpointStats } = await supabase
      .from('api_endpoint_statistics')
      .select('*')
      .limit(10);

    // 収益推移データ
    const { data: revenueData } = await supabase
      .from('revenue_summary')
      .select('*')
      .order('month', { ascending: false })
      .limit(6);

    // システムメトリクス
    const { data: systemMetrics } = await supabase
      .from('system_metrics')
      .select('*')
      .gte('recorded_at', dateFilter.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(100);

    // 平均応答時間計算
    const avgResponseTime = systemMetrics
      ?.filter(m => m.metric_type === 'response_time')
      .reduce((acc, m) => acc + Number(m.metric_value), 0) / 
      (systemMetrics?.filter(m => m.metric_type === 'response_time').length || 1);

    // 稼働率計算
    const uptimeMetrics = systemMetrics?.filter(m => m.metric_type === 'uptime');
    const systemUptime = uptimeMetrics && uptimeMetrics.length > 0 
      ? uptimeMetrics[0].metric_value 
      : 99.98;

    return NextResponse.json({
      overview: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0,
        monthlyRevenue,
        apiCallsToday: apiCallsToday || 0,
        avgResponseTime: Math.round(avgResponseTime || 42),
        systemUptime: Number(systemUptime)
      },
      planDistribution: planCounts,
      revenueData: revenueData || [],
      apiEndpointStats: apiEndpointStats || [],
      recentMetrics: {
        period,
        metrics: systemMetrics || []
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Statistics API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}