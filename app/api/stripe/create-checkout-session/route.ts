// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const stripe = getStripeClient()

    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { billingCycle = 'monthly', planType = 'standard' } = body

    console.log('📋 Checkout request:', {
      userId: session.user.id,
      email: session.user.email,
      billingCycle,
      planType,
      body
    })

    // Get or determine Stripe Price ID
    let priceId: string

    if (planType === 'standard') {
      if (billingCycle === 'yearly') {
        priceId = process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID || 'price_1SGVLZBhdDcfCsmvFa5iVe8r'
      } else {
        priceId = process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID || 'price_1SGVArBhdDcfCsmvM54B7xdN'
      }
    } else {
      console.error('❌ Invalid plan type:', planType)
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      )
    }

    console.log('💳 Using Stripe Price ID:', priceId)

    // Get the origin for redirect URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?payment_cancelled=true`,
      customer_email: session.user.email,
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
    })

    console.log('✅ Checkout session created:', {
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    })

    return NextResponse.json({ sessionUrl: checkoutSession.url })
  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
