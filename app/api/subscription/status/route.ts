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

    // プロフィールからトライアル情報を取得（RPC関数を使用）
    const { data: trialData, error: trialError } = await supabase
      .rpc('get_trial_info')
      .single() as {
        data: { plan: string; trial_ends_at: string } | null;
        error: any
      };

    if (trialError) {
      console.error('❌ Error fetching trial info:', trialError);
    }

    // トライアル情報を計算
    let trialInfo = null;
    if (trialData && trialData.plan === 'freemium' && trialData.trial_ends_at) {
      const trialEndsAt = new Date(trialData.trial_ends_at);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const isActive = trialEndsAt > now;

      trialInfo = {
        trial_ends_at: trialData.trial_ends_at,
        days_remaining: daysRemaining,
        is_trial_active: isActive,
        trial_status: isActive ? 'active' : 'expired'
      };
    }

    // user_subscriptions を取得
    const { data: userSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('❌ Error fetching user subscription:', {
        code: subError.code,
        message: subError.message,
        details: subError.details
      });
    }

    // サブスクリプションが存在する場合、プラン情報を別途取得
    let subscription: any = null;
    if (userSub && !subError) {
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', userSub.plan_id)
        .single();

      if (planError) {
        console.error('❌ Error fetching plan:', planError);
      }

      subscription = {
        ...userSub,
        subscription_plans: planData
      };
    }

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
          },
          trial: trialInfo
        }, {
          headers: {
            'Cache-Control': 'no-store',
            'Vary': 'Cookie, Authorization'
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

    const responseData = {
      subscription: subscription,
      trial: trialInfo
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store',
        'Vary': 'Cookie, Authorization'
      }
    });

  } catch (error: any) {
    console.error('💥 Unexpected error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
