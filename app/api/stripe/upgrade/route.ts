// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs'; // Stripe SDK requires Node.js runtime

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

/**
 * エラーオブジェクトを文字列に変換（React #31 回避）
 */
function textError(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const any = err as any;
    return any.message ?? any.error ?? JSON.stringify(any);
  }
  return 'Unknown error';
}

/**
 * Stripe Upgrade API（既存サブスクリプションの価格変更）
 *
 * 既存のサブスクリプションがある場合は、Checkout Sessionを作成せずに
 * SubscriptionItem.updateで価格を差し替えます。
 * これにより：
 * - ユーザー体験が向上（シームレスなアップグレード）
 * - 即時プロレーション（差額精算）
 * - 新しい支払いフロー不要
 *
 * 既存サブスクリプションがない場合は、Checkout Session作成を案内します。
 */
export async function POST(request: NextRequest) {
  // ★ 1) Stripe Secret Key 存在チェック
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
    return NextResponse.json(
      { error: 'Stripe is not configured. Please contact support.' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secret, {
    apiVersion: '2023-10-16',
  });

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // ★ 2) リクエストボディのパース
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Invalid JSON body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { priceId, planType, billingCycle } = body;

    if (!priceId) {
      console.error('❌ Missing priceId');
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }

    console.log('📋 Upgrade request:', {
      userId: session.user.id,
      email: session.user.email,
      priceId,
      planType,
      billingCycle,
    });

    // ★ 3) 現在のサブスクリプション情報を取得
    const { data: userSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('user_id', session.user.id)
      .single();

    if (subError) {
      console.error('❌ Failed to get current subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to get current subscription' },
        { status: 500 }
      );
    }

    // ★ 4) 既存サブスクリプションがある場合は価格を差し替え
    if (userSub?.stripe_subscription_id) {
      try {
        // 既存サブスクリプションを取得
        const sub = await stripe.subscriptions.retrieve(userSub.stripe_subscription_id);

        if (sub.items.data.length === 0) {
          console.error('❌ No subscription items found');
          return NextResponse.json(
            { error: 'No subscription items found' },
            { status: 500 }
          );
        }

        const currentItem = sub.items.data[0]; // 単一アイテム想定

        // 価格を差し替え（プロレーション付き）
        await stripe.subscriptionItems.update(currentItem.id, {
          price: priceId,
          proration_behavior: 'create_prorations', // 差額按分（正/負）を即時反映
        });

        console.log(`✅ Subscription ${sub.id} upgraded to price ${priceId} with proration`);

        // ★ 5) DBを更新
        if (planType) {
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('name', planType)
            .single();

          if (plan) {
            await supabase
              .from('user_subscriptions')
              .update({
                plan_id: plan.id,
                billing_cycle: billingCycle || 'monthly',
                status: sub.status,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', session.user.id);
          }
        }

        return NextResponse.json({
          success: true,
          method: 'subscription_item_update',
          message: 'Subscription upgraded successfully with prorated billing',
          subscriptionId: sub.id,
        });

      } catch (stripeError: any) {
        console.error('❌ Failed to upgrade subscription:', stripeError);
        return NextResponse.json(
          { error: `Failed to upgrade subscription: ${stripeError.message}` },
          { status: 500 }
        );
      }
    }

    // ★ 6) 既存サブスクリプションがない場合はCheckout Sessionが必要
    console.log('⚠️ No existing subscription found, requires checkout');
    return NextResponse.json({
      success: false,
      requiresCheckout: true,
      message: 'No existing subscription found. Please use the checkout flow.',
    });

  } catch (error: any) {
    const errorMessage = textError(error);

    console.error('❌ Stripe upgrade failed:', {
      error: errorMessage,
      name: error?.name,
      type: error?.type,
      statusCode: error?.statusCode,
      code: error?.code,
      stack: error?.stack,
      raw: error
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
