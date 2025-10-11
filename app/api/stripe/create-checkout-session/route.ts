import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/utils/supabase/unified-client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { plan, billingPeriod } = body;

    console.log('📋 Received checkout request:', {
      userId: session.user.id,
      plan,
      billingPeriod,
      email: session.user.email
    });

    if (!plan || !billingPeriod) {
      return NextResponse.json(
        { error: 'プランと請求期間を指定してください' },
        { status: 400 }
      );
    }

    // Freemium plan doesn't require payment
    if (plan === 'freemium') {
      return NextResponse.json(
        { error: 'Freemiumプランは支払い不要です' },
        { status: 400 }
      );
    }

    // Get the price ID from environment variables
    const priceId = billingPeriod === 'monthly'
      ? process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID
      : process.env.STRIPE_STANDARD_YEARLY_PRICE_ID;

    if (!priceId) {
      console.error('❌ Stripe price ID not configured:', { plan, billingPeriod });
      return NextResponse.json(
        { error: 'プラン設定が見つかりません' },
        { status: 500 }
      );
    }

    console.log('💳 Creating Stripe checkout session:', {
      priceId,
      userId: session.user.id,
      email: session.user.email
    });

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment_success=true`,
      cancel_url: `${req.headers.get('origin')}/signup?payment_cancelled=true`,
      customer_email: session.user.email,
      client_reference_id: session.user.id,
      metadata: {
        user_id: session.user.id,
        plan: plan,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          user_id: session.user.id,
          plan: plan,
        },
      },
    });

    console.log('✅ Checkout session created:', {
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('❌ Stripe checkout session creation error:', error);
    return NextResponse.json(
      { error: 'チェックアウトセッションの作成に失敗しました' },
      { status: 500 }
    );
  }
}
