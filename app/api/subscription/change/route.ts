// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';
import Stripe from 'stripe';

/**
 * Stripe client (lazy initialization)
 */
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

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
    // ACTION: downgrade to freemium (期末キャンセル + 按分処理)
    // ==========================================================================
    if (action === 'downgrade' && planType === 'freemium') {
      console.log('⬇️ Processing downgrade to freemium...');

      // 1) Freemiumプランを取得
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

      // 2) 現在のサブスクリプション情報を取得（stripe_customer_id, stripe_subscription_id含む）
      const { data: currentSub, error: subError } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id, stripe_subscription_id, status')
        .eq('user_id', user.id)
        .single();

      if (subError) {
        console.error('❌ Failed to get current subscription:', subError);
        return NextResponse.json(
          { error: 'Failed to get current subscription' },
          { status: 500 }
        );
      }

      // 3) Stripeサブスクリプションをキャンセル（期末キャンセル + 按分処理）
      if (currentSub?.stripe_subscription_id) {
        try {
          const stripe = getStripeClient();

          // 按分ポリシー：
          // - 'create_prorations': 未使用分をクレジットとして次回請求に反映（推奨）
          // - 'none': 按分なし（期末まで使える）
          await stripe.subscriptions.update(
            currentSub.stripe_subscription_id,
            {
              cancel_at_period_end: true, // 期末でキャンセル
              proration_behavior: 'create_prorations', // 按分あり
              metadata: {
                downgraded_by: user.id,
                downgraded_at: new Date().toISOString(),
              },
            }
          );

          console.log(`✅ Stripe subscription ${currentSub.stripe_subscription_id} set to cancel at period end with prorations`);
        } catch (stripeError: any) {
          console.error('❌ Failed to cancel Stripe subscription:', stripeError);
          return NextResponse.json(
            { error: `Failed to cancel Stripe subscription: ${stripeError.message}` },
            { status: 500 }
          );
        }
      }

      // 4) DB を更新（Webhookで最終的に同期されるが、即時反映のため）
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan_id: freemiumPlan.id,
          billing_cycle: 'monthly',
          cancel_at_period_end: true, // ★ 重要: Stripeと同期
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Failed to update subscription:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        return NextResponse.json(
          {
            error: 'Failed to downgrade subscription',
            details: updateError.message,
            code: updateError.code
          },
          { status: 500 }
        );
      }

      console.log('✅ Successfully downgraded to freemium for user:', user.id);

      return NextResponse.json({
        success: true,
        message: 'Successfully scheduled downgrade to Freemium. Your subscription will remain active until the end of the current billing period.',
        plan: {
          id: freemiumPlan.id,
          name: freemiumPlan.name,
          billing_cycle: 'monthly',
          cancel_at_period_end: true,
        }
      });
    }

    // ==========================================================================
    // ACTION: cancel_immediate (即時キャンセル + 返金)
    // ==========================================================================
    if (action === 'cancel_immediate') {
      console.log('🚨 Processing immediate cancellation with refund...');

      // 1) 現在のサブスクリプション情報を取得
      const { data: currentSub, error: subError } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id, stripe_subscription_id, status, plan_id')
        .eq('user_id', user.id)
        .single();

      if (subError || !currentSub) {
        console.error('❌ Failed to get current subscription:', subError);
        return NextResponse.json(
          { error: 'Failed to get current subscription' },
          { status: 500 }
        );
      }

      if (!currentSub.stripe_subscription_id) {
        console.error('❌ No Stripe subscription found for user:', user.id);
        return NextResponse.json(
          { error: 'No active Stripe subscription found' },
          { status: 404 }
        );
      }

      try {
        const stripe = getStripeClient();

        // 2) サブスクリプションを即時キャンセル（按分あり）
        const canceledSub = await stripe.subscriptions.cancel(
          currentSub.stripe_subscription_id,
          {
            prorate: true, // 未使用分を計算
          }
        );

        console.log(`✅ Stripe subscription ${currentSub.stripe_subscription_id} canceled immediately`);

        // 3) 最新のインボイスを取得
        const latestInvoice = canceledSub.latest_invoice;
        if (latestInvoice && typeof latestInvoice === 'string') {
          const invoice = await stripe.invoices.retrieve(latestInvoice);

          // 4) Credit Note を発行（未使用分を返金）
          // ※ ビジネス要件に応じて返金額を調整してください
          if (invoice.amount_paid > 0) {
            // 例: 50%返金（実際の按分計算はビジネスロジックに応じて調整）
            const refundAmount = Math.round(invoice.amount_paid * 0.5);

            const creditNote = await stripe.creditNotes.create({
              invoice: invoice.id,
              lines: [
                {
                  type: 'custom_line_item',
                  description: 'Prorated refund for unused subscription',
                  amount: refundAmount,
                },
              ],
              refund_amount: refundAmount,
            });

            console.log(`✅ Credit Note ${creditNote.id} created for ${refundAmount / 100} ${invoice.currency}`);
          }
        }

        // 5) DBを更新（Freemiumプランに戻す）
        const { data: freemiumPlan } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('name', 'freemium')
          .single();

        if (freemiumPlan) {
          await supabase
            .from('user_subscriptions')
            .update({
              plan_id: freemiumPlan.id,
              billing_cycle: 'monthly',
              status: 'canceled',
              cancel_at_period_end: false,
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }

        return NextResponse.json({
          success: true,
          message: 'Subscription canceled immediately with prorated refund',
          refund_issued: true,
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
