import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // Stripeクライアントの初期化（実行時）
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover',
  });

  // Supabaseクライアントの初期化（実行時）
  // RLSポリシーでanon readを許可したので、anonキーを使用
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log('🔑 Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    usingKey: anonKey ? `${anonKey.substring(0, 20)}...` : 'NONE'
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey
  );
  try {
    // リクエストボディから必要な情報を取得
    const { userId, planId, userEmail } = await req.json();

    console.log('📋 Received request:', { userId, planId, userEmail });

    if (!userId || !planId || !userEmail) {
      return NextResponse.json(
        { error: 'userId, planId, and userEmail are required' },
        { status: 400 }
      );
    }

    // プラン情報を取得
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    console.log('🔍 Plan lookup result:', { planData, planError });

    if (planError || !planData) {
      console.error('❌ Plan not found:', { planId, error: planError });
      return NextResponse.json(
        {
          error: 'Plan not found',
          details: {
            planId,
            errorMessage: planError?.message,
            errorCode: planError?.code
          }
        },
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
      customer_email: userEmail,
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
