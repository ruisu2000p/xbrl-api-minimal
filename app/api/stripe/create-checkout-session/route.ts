import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripeクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.XBRL_SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // リクエストボディから必要な情報を取得
    const { userId, planId } = await req.json();

    if (!userId || !planId) {
      return NextResponse.json(
        { error: 'userId and planId are required' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // プラン情報を取得
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Standardプラン以外は決済不要
    if (planData.name !== 'standard') {
      return NextResponse.json(
        { error: 'This plan does not require payment' },
        { status: 400 }
      );
    }

    // Stripe Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userData.user.email,
      line_items: [
        {
          price: process.env.STRIPE_STANDARD_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/dashboard?payment=success`,
      cancel_url: `${req.headers.get('origin')}/dashboard?payment=cancelled`,
      metadata: {
        userId: userId,
        planId: planId,
      },
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
