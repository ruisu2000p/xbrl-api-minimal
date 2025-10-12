// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';

/**
 * GET /api/subscription/status
 *
 * 認証済みユーザーの現在のサブスクリプション情報を返す
 * フロントエンドのプラン表示更新用
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('📊 Fetching subscription status for user:', user.id);

    // user_subscriptions と subscription_plans を結合して取得
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id,
        plan_id,
        status,
        billing_cycle,
        stripe_customer_id,
        stripe_subscription_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        cancelled_at,
        created_at,
        updated_at,
        subscription_plans (
          id,
          name,
          description,
          price_monthly,
          price_yearly,
          features
        )
      `)
      .eq('user_id', user.id)
      .single() as any;

    if (subError) {
      // サブスクリプションが存在しない場合は、デフォルトでFreemiumを返す
      if (subError.code === 'PGRST116') {
        console.log('⚠️ No subscription found, returning default freemium');

        // Freemiumプランを取得
        const { data: freemiumPlan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', 'freemium')
          .single();

        return NextResponse.json({
          subscription: {
            user_id: user.id,
            plan_id: freemiumPlan?.id || null,
            status: 'active',
            billing_cycle: 'monthly',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            current_period_start: null,
            current_period_end: null,
            cancel_at_period_end: false,
            cancelled_at: null,
            subscription_plans: freemiumPlan || {
              name: 'freemium',
              description: 'Freemium plan with basic features',
              price_monthly: 0,
              price_yearly: 0,
              features: {}
            }
          }
        });
      }

      console.error('❌ Error fetching subscription:', {
        code: subError.code,
        message: subError.message,
        details: subError.details,
        hint: subError.hint
      });
      return NextResponse.json(
        {
          error: 'Failed to fetch subscription',
          code: subError.code,
          message: subError.message,
          details: subError.details
        },
        { status: 500 }
      );
    }

    console.log('✅ Subscription fetched successfully:', {
      user_id: user.id,
      plan: subscription?.subscription_plans?.name,
      billing_cycle: subscription?.billing_cycle,
      status: subscription?.status
    });

    return NextResponse.json({
      subscription: subscription
    });

  } catch (error: any) {
    console.error('💥 Unexpected error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
