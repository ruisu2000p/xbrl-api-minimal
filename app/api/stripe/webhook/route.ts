import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // Stripeクライアントの初期化（実行時）
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover',
  });

  // Supabaseクライアントの初期化（実行時）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.XBRL_SUPABASE_SERVICE_KEY!
  );
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Webhookの署名を検証
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // イベントタイプに応じて処理
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, stripe, supabase);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Checkout完了時の処理
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>
) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Stripeのサブスクリプション情報を取得
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // 次回請求日を計算（型キャストで対応）
  const subscriptionData = subscription as any;
  const currentPeriodEnd = new Date((subscriptionData.current_period_end || 0) * 1000);

  // user_subscriptionsを更新
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      plan_id: planId,
      status: 'active',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      current_period_start: new Date((subscriptionData.current_period_start || 0) * 1000).toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating subscription:', updateError);
    throw updateError;
  }

  console.log(`✅ Subscription activated for user ${userId}`);
}

// サブスクリプション更新時の処理
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  const subscriptionData = subscription as any;
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: subscriptionData.status,
      current_period_start: new Date((subscriptionData.current_period_start || 0) * 1000).toISOString(),
      current_period_end: new Date((subscriptionData.current_period_end || 0) * 1000).toISOString(),
      cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionData.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`✅ Subscription updated: ${subscriptionData.id}`);
}

// サブスクリプション削除時の処理
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
) {
  const subscriptionData = subscription as any;
  // Freemiumプランに戻す
  const { data: freemiumPlan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('name', 'freemium')
    .single();

  if (!freemiumPlan) {
    console.error('Freemium plan not found');
    return;
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      plan_id: freemiumPlan.id,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      stripe_subscription_id: null,
      stripe_customer_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionData.id);

  if (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }

  console.log(`✅ Subscription cancelled: ${subscriptionData.id}`);
}
