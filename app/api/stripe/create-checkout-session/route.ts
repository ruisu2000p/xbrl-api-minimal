// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs'; // Stripe SDK requires Node.js runtime

import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createStripeClient } from '@/utils/stripe/client'
import type Stripe from 'stripe'

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
 * Stripe Checkout Session作成API
 *
 * 堅牢化ポイント:
 * 1. 環境変数の存在チェック
 * 2. 入力バリデーション
 * 3. 既存サブスクリプションの存在チェック（重複防止）
 * 4. Price ID解決の明確化
 * 5. Idempotency Key対応
 * 6. プロレーション設定
 * 7. 詳細なエラーログ
 */
export async function POST(request: NextRequest) {
  const idempotencyKey = (request.headers.get('idempotency-key') ?? '').trim();
  const csrfHeader = request.headers.get('x-csrf-token') ?? '';
  const csrfCookie = (request.headers.get('cookie') ?? '')
    .split('; ')
    .find((r) => r.startsWith('csrf-token='))?.split('=')[1] ?? '';

  // ★ CSRF二重チェック（middlewareでも検証済みだが、API単体でも守る）
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    console.error('❌ CSRF validation failed at API level', {
      hasHeader: !!csrfHeader,
      hasCookie: !!csrfCookie,
      match: csrfHeader === csrfCookie
    });
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // ★ 1) Stripe client initialization
  const stripe = createStripeClient();

  // ★ 2) リクエストボディのパース
  let body: any;
  try {
    body = await request.json();
  } catch (parseError) {
    console.error('❌ Invalid JSON body:', parseError);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const planType = body?.planType as string | undefined;
  const billingCycle = body?.billingCycle as string | undefined;

  // ★ 3) 入力バリデーション
  if (!planType || !billingCycle) {
    console.error('❌ Missing required fields', { planType, billingCycle });
    return NextResponse.json(
      { error: 'Missing planType or billingCycle' },
      { status: 400 }
    );
  }

  if (!['monthly', 'yearly'].includes(billingCycle)) {
    console.error('❌ Invalid billingCycle:', billingCycle);
    return NextResponse.json(
      { error: 'billingCycle must be "monthly" or "yearly"' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('📋 Checkout request:', {
      userId: user.id,
      email: user.email,
      planType,
      billingCycle,
      idempotencyKey: idempotencyKey || '(none)'
    });

    // ★ 4) 既存サブスクリプションの存在チェック
    const { data: existingSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, status')
      .eq('user_id', user.id)
      .maybeSingle(); // 新規ユーザーの場合nullを返す（エラーをスローしない）

    // データベースエラーのチェック
    if (subError) {
      console.error('❌ Failed to check existing subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to check existing subscription' },
        { status: 500 }
      );
    }

    // 既存のアクティブなサブスクリプションがあるかチェック
    const activeStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
    const hasActiveSubscription = existingSub?.stripe_subscription_id &&
                                  existingSub.status &&
                                  activeStatuses.includes(existingSub.status);

    if (hasActiveSubscription) {
      console.log('🔄 Existing subscription detected - will update plan via Checkout', {
        userId: user.id,
        subscriptionId: existingSub.stripe_subscription_id,
        currentStatus: existingSub.status
      });
    }

    // ★ 5) Price ID 解決（環境変数マッピング）
    const PRICE_MAP: Record<string, Record<string, string | undefined>> = {
      standard: {
        monthly: process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID || 'price_1SGVArBhdDcfCsmvM54B7xdN',
        yearly: process.env.STRIPE_STANDARD_YEARLY_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID || 'price_1SGVLZBhdDcfCsmvFa5iVe8r',
      },
      // 他のプランもここに追加可能
    };

    const priceId = PRICE_MAP[planType]?.[billingCycle];

    if (!priceId) {
      console.error('❌ Price ID not configured', { planType, billingCycle, PRICE_MAP });
      return NextResponse.json(
        { error: `Price ID not configured for plan=${planType} billing=${billingCycle}` },
        { status: 400 }
      );
    }

    console.log('💳 Using Stripe Price ID:', priceId);

    // Get the origin for redirect URLs
    const originHeader = request.headers.get('origin');
    const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    const origin = originHeader
      || envSiteUrl
      || envBaseUrl
      || 'http://localhost:3000';

    const successUrl = `${origin}/dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/dashboard?payment_cancelled=true`;

    console.log('🔗 Origin resolution:', {
      originHeader,
      envSiteUrl,
      envBaseUrl,
      selectedOrigin: origin,
      successUrl,
      cancelUrl
    });

    // ★ 6) Stripe Checkout Session作成
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (hasActiveSubscription && existingSub?.stripe_subscription_id && existingSub?.stripe_customer_id) {
      // 既存サブスクリプションがある場合（プラン変更）
      // 既存の顧客IDを使って新しいサブスクリプションを作成し、
      // Webhookで古いサブスクリプションをキャンセルする
      console.log('📝 Creating checkout for plan change (will replace existing subscription)');

      sessionParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: existingSub.stripe_customer_id, // 既存の顧客IDを使用
        allow_promotion_codes: true,
        metadata: {
          user_id: user.id,
          plan_type: planType,
          billing_cycle: billingCycle,
          is_plan_change: 'true',
          old_subscription_id: existingSub.stripe_subscription_id,
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_type: planType,
            billing_cycle: billingCycle,
            is_plan_change: 'true',
            old_subscription_id: existingSub.stripe_subscription_id,
          },
        },
      };
    } else {
      // 新規サブスクリプション作成
      console.log('📝 Creating checkout for new subscription');

      sessionParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email,
        allow_promotion_codes: true,
        metadata: {
          user_id: user.id,
          plan_type: planType,
          billing_cycle: billingCycle,
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_type: planType,
            billing_cycle: billingCycle,
          },
        },
      };
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      sessionParams,
      idempotencyKey ? { idempotencyKey } : undefined
    );

    console.log('✅ Checkout session created:', {
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      customer_email: user.email
    });

    return NextResponse.json({ url: checkoutSession.url, sessionUrl: checkoutSession.url });

  } catch (error: any) {
    // ★ 7) 詳細なエラーログ + 文字列化してフロントに返す
    const errorMessage = textError(error);

    console.error('❌ Stripe checkout session creation failed:', {
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
