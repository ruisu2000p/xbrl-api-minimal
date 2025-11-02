// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs'; // Stripe SDK requires Node.js runtime

import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

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
 * 3. Price ID解決の明確化
 * 4. Idempotency Key対応
 * 5. 詳細なエラーログ
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
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('📋 Checkout request:', {
      userId: session.user.id,
      email: session.user.email,
      planType,
      billingCycle,
      idempotencyKey: idempotencyKey || '(none)'
    });

    // ★ 4) Price ID 解決（環境変数マッピング）
    const PRICE_MAP: Record<string, Record<string, string | undefined>> = {
      standard: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID || 'price_1SGVArBhdDcfCsmvM54B7xdN',
        yearly: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID || 'price_1SGVLZBhdDcfCsmvFa5iVe8r',
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
    const origin = request.headers.get('origin')
      || process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_BASE_URL
      || 'http://localhost:3000';

    const successUrl = `${origin}/dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/dashboard?payment_cancelled=true`;

    console.log('🔗 Redirect URLs:', { successUrl, cancelUrl });

    // ★ 5) Stripe Checkout Session作成（Idempotency Key対応）
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
      customer_email: session.user.email,
      allow_promotion_codes: true,
      metadata: {
        user_id: session.user.id,
        plan_type: planType,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          user_id: session.user.id,
          plan_type: planType,
          billing_cycle: billingCycle,
        },
      },
    };

    const checkoutSession = await stripe.checkout.sessions.create(
      sessionParams,
      idempotencyKey ? { idempotencyKey } : undefined
    );

    console.log('✅ Checkout session created:', {
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      customer_email: session.user.email
    });

    return NextResponse.json({ url: checkoutSession.url, sessionUrl: checkoutSession.url });

  } catch (error: any) {
    // ★ 6) 詳細なエラーログ + 文字列化してフロントに返す
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
