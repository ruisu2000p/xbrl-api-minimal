// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceSupabaseClient } from '@/utils/supabase/unified-client';
import { createStripeClient } from '@/utils/stripe/client';
import type Stripe from 'stripe';

/**
 * Stripe の 404/410 エラーを判定（存在しないリソース）
 */
function isStripeNotFoundLike(err: any): boolean {
  const code = err?.statusCode || err?.raw?.statusCode;
  const type = err?.type;
  return code === 404 || code === 410 || type === 'invalid_request_error' || err?.code === 'resource_missing';
}

/**
 * ユーザーをFreemiumプランに同期（自己修復）
 * べき等性: 既にFreemiumの場合はスキップ
 */
async function syncToFreemium(supabase: any, userId: string, freemiumPlanId: string) {
  // べき等性チェック: 既にFreemiumならスキップ
  const { data: current } = await supabase
    .from('user_subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .single();

  if (current?.plan_id === freemiumPlanId && current?.status === 'canceled') {
    console.log(`✅ User ${userId} already on freemium, skipping sync (idempotent)`);
    return;
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      plan_id: freemiumPlanId,
      billing_cycle: 'monthly',
      status: 'canceled',
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      stripe_customer_id: null,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_action: null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Failed to sync to freemium:', error);
    throw error;
  }

  console.log(`✅ User ${userId} synced to freemium plan (self-healing)`);
}

/**
 * Stripe上のアクティブなサブスクリプションを解決（Source of Truth）
 *
 * DBが不整合でも、Stripeから実体を直接取得して特定する
 *
 * @param opts.stripe - Stripe client
 * @param opts.userId - App user ID
 * @param opts.email - User email (for customer search)
 * @param opts.stripeCustomerId - DB cached customer ID (nullable)
 * @param opts.stripeSubscriptionId - DB cached subscription ID (nullable)
 * @returns { customerId, subscription } - Resolved Stripe entities
 */
async function resolveActiveStripeSubscription(opts: {
  stripe: Stripe;
  userId: string;
  email?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<{
  customerId: string | null;
  subscription: Stripe.Subscription | null;
  resolutionPath: 'by_subscription_id' | 'by_customer_id' | 'by_email_search' | 'not_found';
}> {
  const { stripe, userId, email, stripeCustomerId, stripeSubscriptionId } = opts;

  console.log('🔍 Resolving Stripe subscription...', {
    userId,
    db_customer_id: stripeCustomerId,
    db_subscription_id: stripeSubscriptionId,
    email,
  });

  // Strategy 1: DBにsubscription_idがある場合、それを直接検証
  if (stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
        console.log('✅ Found active subscription via DB subscription_id:', sub.id);
        return {
          customerId: String(sub.customer),
          subscription: sub,
          resolutionPath: 'by_subscription_id'
        };
      }
      console.log('⚠️ DB subscription_id exists but status is:', sub.status);
    } catch (err: any) {
      if (!isStripeNotFoundLike(err)) {
        console.error('❌ Error retrieving subscription by ID:', err);
      }
      console.warn(`⚠️ DB subscription_id ${stripeSubscriptionId} not found or invalid in Stripe`);
    }
  }

  // Strategy 2: DBにcustomer_idがある場合、そこからactive subscriptionを探す
  if (stripeCustomerId) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 1,
      });
      if (subs.data.length > 0) {
        console.log('✅ Found active subscription via DB customer_id:', subs.data[0].id);
        return {
          customerId: stripeCustomerId,
          subscription: subs.data[0],
          resolutionPath: 'by_customer_id'
        };
      }
      console.log('⚠️ DB customer_id exists but no active subscriptions found');
    } catch (err: any) {
      console.error('❌ Error listing subscriptions by customer_id:', err);
    }
  }

  // Strategy 3: Emailベースで顧客を検索（metadata.app_user_id を優先マッチング）
  if (email) {
    try {
      const customers = await stripe.customers.list({ email, limit: 10 });

      // 優先順位: metadata.app_user_id が一致する顧客
      let matchedCustomer = customers.data.find(c => c.metadata?.app_user_id === userId);

      // 次点: metadata がない場合は最初の顧客
      if (!matchedCustomer && customers.data.length > 0) {
        matchedCustomer = customers.data[0];
        console.warn(`⚠️ Using email-matched customer ${matchedCustomer.id} without metadata.app_user_id validation`);
      }

      if (matchedCustomer) {
        const subs = await stripe.subscriptions.list({
          customer: matchedCustomer.id,
          status: 'active',
          limit: 1,
        });
        if (subs.data.length > 0) {
          console.log('✅ Found active subscription via email search:', subs.data[0].id);
          return {
            customerId: matchedCustomer.id,
            subscription: subs.data[0],
            resolutionPath: 'by_email_search'
          };
        }
        console.log(`⚠️ Customer ${matchedCustomer.id} found by email but no active subscriptions`);
      }
    } catch (err: any) {
      console.error('❌ Error searching customers by email:', err);
    }
  }

  console.log('❌ No active Stripe subscription found for user:', userId);
  return { customerId: null, subscription: null, resolutionPath: 'not_found' };
}

/**
 * POST /api/subscription/change
 *
 * サブスクリプション変更API（Stripe-first approach）
 *
 * - DBを信用せず、常にStripeを真実のソース(Source of Truth)として照会
 * - DB不整合があれば自己修復(self-healing)
 * - べき等性を担保（idempotency-key対応）
 */
export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;

  try {
    // 認証確認
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

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
      user_email: user.email,
      action,
      planType,
      idempotency_key: idempotencyKey,
    });

    // Service Role クライアント（RLSバイパス）
    const supabase = await createServiceSupabaseClient();
    const stripe = createStripeClient();

    // Freemiumプラン取得
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

    // DBの現在情報を取得（参考値として）
    const { data: currentSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id, stripe_customer_id, stripe_subscription_id, status, plan_id')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('❌ Failed to get current subscription from DB:', subError);
      return NextResponse.json(
        { error: 'Failed to get current subscription' },
        { status: 500 }
      );
    }

    // ★ 真実はStripe側にある: DBを信用せず、Stripeから実体を解決
    const { customerId, subscription, resolutionPath } = await resolveActiveStripeSubscription({
      stripe,
      userId: user.id,
      email: user.email,
      stripeCustomerId: currentSub?.stripe_customer_id,
      stripeSubscriptionId: currentSub?.stripe_subscription_id,
    });

    console.log('🔎 Stripe resolution result:', {
      userId: user.id,
      db_customer_id: currentSub?.stripe_customer_id,
      db_subscription_id: currentSub?.stripe_subscription_id,
      resolved_customer_id: customerId,
      resolved_subscription_id: subscription?.id ?? null,
      resolved_status: subscription?.status ?? null,
      resolution_path: resolutionPath,
    });

    // ==========================================================================
    // ACTION: downgrade to freemium (期末キャンセル)
    // ==========================================================================
    if (action === 'downgrade' && planType === 'freemium') {
      console.log('⬇️ Processing downgrade to freemium...');

      // Stripe上にアクティブなサブスクリプションが無い場合 → 自己修復
      if (!subscription || subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
        console.warn('⚠️ No active subscription on Stripe; self-healing to freemium');
        await syncToFreemium(supabase, user.id, freemiumPlan.id);
        return NextResponse.json({
          success: true,
          message: 'No active subscription found. Database synchronized to freemium.',
          self_healed: true,
        });
      }

      // Stripe上でサブスクリプションを期末キャンセル設定
      try {
        const updated = await stripe.subscriptions.update(
          subscription.id,
          {
            cancel_at_period_end: true,
            proration_behavior: 'create_prorations', // 按分クレジット
            metadata: {
              downgraded_by: user.id,
              downgraded_at: new Date().toISOString(),
              action: 'downgrade_to_freemium',
            },
          },
          idempotencyKey ? { idempotencyKey: `${idempotencyKey}-downgrade` } : undefined
        );

        console.log(`✅ Stripe subscription ${updated.id} set to cancel at period end with prorations`);

        // DB即時反映（Webhookで最終確定）
        await supabase
          .from('user_subscriptions')
          .update({
            plan_id: freemiumPlan.id,
            billing_cycle: 'monthly',
            cancel_at_period_end: true,
            stripe_customer_id: customerId, // 解決したIDで更新
            stripe_subscription_id: updated.id, // 解決したIDで更新
            status: updated.status,
            pending_action: 'downgrade_to_freemium',
            last_resolution_path: resolutionPath, // トラッキング
            last_resolved_at: new Date().toISOString(), // トラッキング
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        console.log('✅ DB updated with pending downgrade');

        return NextResponse.json({
          success: true,
          message: 'Successfully scheduled downgrade to Freemium. Your subscription will remain active until the end of the current billing period.',
          subscription_id: updated.id,
          cancel_at_period_end: true,
        });
      } catch (stripeError: any) {
        console.error('❌ Failed to update Stripe subscription:', stripeError);
        return NextResponse.json(
          { error: `Failed to cancel Stripe subscription: ${stripeError.message}` },
          { status: 500 }
        );
      }
    }

    // ==========================================================================
    // ACTION: cancel_immediate (即時キャンセル + 按分返金)
    // ==========================================================================
    if (action === 'cancel_immediate') {
      console.log('🚨 Processing immediate cancellation with refund...');

      // Stripe上にアクティブなサブスクリプションが無い場合 → 自己修復
      if (!subscription || subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
        console.warn('⚠️ No active subscription on Stripe; self-healing to freemium');
        await syncToFreemium(supabase, user.id, freemiumPlan.id);
        return NextResponse.json({
          success: true,
          message: 'Subscription already canceled. Database synchronized to freemium.',
          self_healed: true,
        });
      }

      try {
        // 即時キャンセル（按分あり）
        const canceled = await stripe.subscriptions.cancel(
          subscription.id,
          { prorate: true },
          idempotencyKey ? { idempotencyKey: `${idempotencyKey}-cancel` } : undefined
        );

        console.log(`✅ Stripe subscription ${canceled.id} canceled immediately`);

        // 返金処理（Credit Note発行）
        const latestInvoice = canceled.latest_invoice;
        let refundAmount = 0;
        let refundId: string | null = null;

        if (latestInvoice && typeof latestInvoice === 'string') {
          const invoice = await stripe.invoices.retrieve(latestInvoice);

          if (invoice.amount_paid > 0) {
            const periodStart = (subscription as any).current_period_start as number;
            const periodEnd = (subscription as any).current_period_end as number;
            const nowSec = Math.floor(Date.now() / 1000);

            if (nowSec < periodEnd) {
              const totalPeriod = periodEnd - periodStart;
              const unusedPeriod = periodEnd - nowSec;
              const proratedAmount = Math.floor(invoice.amount_paid * (unusedPeriod / totalPeriod));

              if (proratedAmount > 0) {
                const creditNote = await stripe.creditNotes.create({
                  invoice: invoice.id,
                  lines: [
                    {
                      type: 'custom_line_item',
                      description: `Prorated refund for ${Math.floor(unusedPeriod / 86400)} unused days`,
                      amount: proratedAmount,
                    },
                  ],
                  refund_amount: proratedAmount,
                });

                refundAmount = proratedAmount;
                refundId = creditNote.id;

                console.log(`✅ Credit Note ${creditNote.id} created for ${proratedAmount / 100} ${invoice.currency}`);
              }
            }
          }
        }

        // DBをFreemiumに同期
        await syncToFreemium(supabase, user.id, freemiumPlan.id);

        return NextResponse.json({
          success: true,
          message: 'Subscription canceled immediately with prorated refund',
          subscription_id: canceled.id,
          refund_amount: refundAmount / 100,
          refund_id: refundId,
        });
      } catch (stripeError: any) {
        console.error('❌ Failed to cancel subscription immediately:', stripeError);
        return NextResponse.json(
          { error: `Failed to cancel subscription: ${stripeError.message}` },
          { status: 500 }
        );
      }
    }

    // ==========================================================================
    // 未対応のaction
    // ==========================================================================
    console.error('❌ Invalid action:', action);
    return NextResponse.json(
      { error: 'Invalid action. Supported: downgrade, cancel_immediate' },
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
