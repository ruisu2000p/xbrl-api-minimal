// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceSupabaseClient } from '@/utils/supabase/unified-client';

// Stripe client (lazy initialization to avoid build errors)
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
}

/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events from Stripe and syncs them to the database.
 * This ensures that the database is always in sync with Stripe's source of truth.
 *
 * Supported events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  const stripe = getStripeClient();

  // Get raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Create admin Supabase client
  const supabase = await createServiceSupabaseClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await handleSubscriptionEvent(supabase, subscription, event.type);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        await handleInvoicePaymentSucceeded(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        await handleInvoicePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription lifecycle events
 */
async function handleSubscriptionEvent(
  supabase: any,
  subscription: Stripe.Subscription,
  eventType: string
) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  if (!customerId) {
    throw new Error('Customer ID not found in subscription');
  }

  // Find user by Stripe customer ID
  const { data: userSub, error: findError } = await supabase
    .from('user_subscriptions')
    .select('user_id, id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !userSub) {
    console.warn(`User not found for customer ${customerId}, skipping sync`);
    return;
  }

  // Prepare update data
  const updateData: any = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  // If subscription is cancelled, set cancelled_at
  if (subscription.status === 'canceled' && subscription.canceled_at) {
    updateData.cancelled_at = new Date(subscription.canceled_at * 1000).toISOString();
  }

  // Update user_subscriptions table
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update(updateData)
    .eq('user_id', userSub.user_id);

  if (updateError) {
    throw new Error(`Failed to update subscription: ${updateError.message}`);
  }

  console.log(`✅ Synced subscription ${subscription.id} for user ${userSub.user_id} (${eventType})`);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  // Update subscription status to active if payment succeeded
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'active' })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'past_due'); // Only update if currently past_due

  if (error) {
    console.error('Failed to update subscription status after payment:', error);
  } else {
    console.log(`✅ Updated subscription status to active for customer ${customerId}`);
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Failed to update subscription status after payment failure:', error);
  } else {
    console.log(`⚠️ Updated subscription status to past_due for customer ${customerId}`);
  }
}
