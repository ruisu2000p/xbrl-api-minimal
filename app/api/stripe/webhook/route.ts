import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Force dynamic rendering for webhook endpoint
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Stripeクライアントの初期化（実行時）
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover',
  });

  // Supabaseクライアントの初期化（実行時）
  // RLSポリシーでanon readを許可したので、anonキーを使用
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get raw body as buffer for Stripe signature verification
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('No stripe-signature header found');
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Webhookの署名を検証
    // Use the raw body string directly
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log(`✅ Webhook verified: ${event.type}`);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err);
    console.error('Signature:', signature);
    console.error('Body preview:', body.substring(0, 100));
    console.error('Secret configured:', !!process.env.STRIPE_WEBHOOK_SECRET);
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
  supabase: any
) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;
  const billingPeriod = session.metadata?.billing_period;

  console.log('📦 Processing checkout completion:', {
    userId,
    plan,
    billingPeriod,
    sessionId: session.id
  });

  if (!userId || !plan) {
    console.error('❌ Missing metadata in checkout session:', session.metadata);
    return;
  }

  // Stripeのサブスクリプション情報を取得
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // 次回請求日を計算
  const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);

  // Use service role client to update user metadata (admin privileges needed)
  const { createAdminClient } = await import('@/utils/supabase/unified-client');
  const adminClient = createAdminClient();

  // Update user metadata with plan information
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        plan: plan,
        billing_period: billingPeriod,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        subscription_status: 'active',
        current_period_end: currentPeriodEnd.toISOString(),
      }
    }
  );

  if (updateError) {
    console.error('❌ Error updating user metadata:', updateError);
    throw updateError;
  }

  console.log(`✅ Subscription activated for user ${userId}:`, {
    plan,
    billingPeriod,
    subscriptionId,
    nextBillingDate: currentPeriodEnd.toISOString()
  });
}

// サブスクリプション更新時の処理
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
  const userId = subscription.metadata?.user_id;

  console.log('🔄 Processing subscription update:', {
    subscriptionId: subscription.id,
    userId,
    status: subscription.status
  });

  if (!userId) {
    console.error('❌ Missing user_id in subscription metadata');
    return;
  }

  // Use service role client to update user metadata
  const { createAdminClient } = await import('@/utils/supabase/unified-client');
  const adminClient = createAdminClient();

  const { data: user, error: getUserError } = await adminClient.auth.admin.getUserById(userId);

  if (getUserError || !user) {
    console.error('❌ Error getting user:', getUserError);
    return;
  }

  const { error } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        ...user.user.user_metadata,
        subscription_status: subscription.status,
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
      }
    }
  );

  if (error) {
    console.error('❌ Error updating subscription:', error);
    throw error;
  }

  console.log(`✅ Subscription updated: ${subscription.id}`);
}

// サブスクリプション削除時の処理
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const userId = subscription.metadata?.user_id;

  console.log('🗑️ Processing subscription deletion:', {
    subscriptionId: subscription.id,
    userId
  });

  if (!userId) {
    console.error('❌ Missing user_id in subscription metadata');
    return;
  }

  // Use service role client to revert user to freemium plan
  const { createAdminClient } = await import('@/utils/supabase/unified-client');
  const adminClient = createAdminClient();

  const { data: user, error: getUserError } = await adminClient.auth.admin.getUserById(userId);

  if (getUserError || !user) {
    console.error('❌ Error getting user:', getUserError);
    return;
  }

  const { error } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        ...user.user.user_metadata,
        plan: 'freemium',
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
        stripe_customer_id: null,
        current_period_end: null,
        cancelled_at: new Date().toISOString(),
      }
    }
  );

  if (error) {
    console.error('❌ Error cancelling subscription:', error);
    throw error;
  }

  console.log(`✅ Subscription cancelled, user reverted to freemium: ${subscription.id}`);
}
