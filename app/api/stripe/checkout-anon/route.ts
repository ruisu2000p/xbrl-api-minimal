// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createStripeClient } from '@/utils/stripe/client';

/**
 * Anonymous Checkout Session Creator for Standard Plan
 *
 * This endpoint creates a Stripe Checkout session for users who want to
 * subscribe to the Standard plan BEFORE creating an account (Pay→Create flow).
 *
 * Flow:
 * 1. User provides email and selects billing cycle
 * 2. Stripe Checkout session is created with customer_creation: 'always'
 * 3. After payment, webhook creates Supabase user account
 * 4. Magic link is sent for initial login
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { email, billingCycle } = body;

    // Validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get price ID from environment
    const priceId = billingCycle === 'monthly'
      ? process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID
      : process.env.STRIPE_STANDARD_YEARLY_PRICE_ID;

    if (!priceId) {
      console.error(`Price ID not configured for ${billingCycle}`);
      return NextResponse.json(
        { error: 'Price not configured' },
        { status: 500 }
      );
    }

    const stripe = createStripeClient();

    // Generate nonce for tracking this signup flow
    const nonce = randomUUID();

    // Get site URL for redirect
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    console.log('📝 Creating anonymous checkout session:', {
      email,
      billingCycle,
      priceId,
      nonce
    });

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_creation: 'always', // Always create a new customer
      customer_email: email,       // Pre-fill email in Checkout
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      success_url: `${origin}/signup/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?cancelled=1`,
      client_reference_id: nonce,  // Track this flow
      metadata: {
        app_flow: 'signup_after_pay',  // Identifies Pay→Create flow
        plan: 'standard',
        billing_cycle: billingCycle,
        signup_email: email,
        nonce
      },
      subscription_data: {
        metadata: {
          app_flow: 'signup_after_pay',
          plan: 'standard',
          billing_cycle: billingCycle,
          signup_email: email
        }
      }
    });

    console.log('✅ Anonymous checkout session created:', {
      session_id: session.id,
      url: session.url
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    const msg = error?.message || error?.raw?.message || 'Failed to create checkout session';
    console.error('❌ checkout-anon error:', {
      message: msg,
      type: error?.type,
      code: error?.code,
      raw: error
    });

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
