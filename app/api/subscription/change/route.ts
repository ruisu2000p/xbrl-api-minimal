// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';

/**
 * POST /api/subscription/change
 *
 * フリーミアムへのダウングレードを即時実行
 * (有料プランへのアップグレードは /api/stripe/create-checkout-session 経由)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, planType } = body;

    console.log('📋 Subscription change request:', {
      user_id: user.id,
      action,
      planType
    });

    // ==========================================================================
    // ACTION: downgrade to freemium (即時実行)
    // ==========================================================================
    if (action === 'downgrade' && planType === 'freemium') {
      console.log('⬇️ Processing downgrade to freemium...');

      // Freemiumプランを取得
      const { data: freemiumPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .eq('name', 'freemium')
        .single();

      if (planError || !freemiumPlan) {
        console.error('❌ Freemium plan not found:', planError);
        return NextResponse.json(
          { error: 'Freemium plan not found' },
          { status: 500 }
        );
      }

      // user_subscriptionsを即時更新
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan_id: freemiumPlan.id,
          billing_cycle: 'monthly', // Freemium default
          status: 'active',
          stripe_customer_id: null, // Stripe連携解除
          stripe_subscription_id: null,
          cancel_at_period_end: false,
          cancelled_at: null,
          current_period_start: null,
          current_period_end: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Failed to update subscription:', updateError);
        return NextResponse.json(
          { error: 'Failed to downgrade subscription' },
          { status: 500 }
        );
      }

      console.log('✅ Successfully downgraded to freemium for user:', user.id);

      return NextResponse.json({
        success: true,
        message: 'Successfully downgraded to Freemium',
        plan: {
          id: freemiumPlan.id,
          name: freemiumPlan.name,
          billing_cycle: 'monthly',
          status: 'active'
        }
      });
    }

    // ==========================================================================
    // その他のaction (今後拡張可能)
    // ==========================================================================
    console.error('❌ Invalid action:', action);
    return NextResponse.json(
      { error: 'Invalid action. Use /api/stripe/create-checkout-session for upgrades.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('💥 Unexpected error in subscription change:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
