// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient } from '@/utils/stripe/client';
import type Stripe from 'stripe';
import { createServiceSupabaseClient } from '@/utils/supabase/unified-client';

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
  const stripe = createStripeClient();

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
    // Trim whitespace from webhook secret to handle environment variable issues
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
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
    // Log the webhook event for idempotency and audit trail
    // Use upsert with onConflict to handle duplicate events gracefully
    const eventPayload = {
      event_id: event.id,
      type: event.type,
      created_at: new Date(event.created * 1000).toISOString(),
      payload: event,
      processed: false,
    };

    const { error: logError } = await supabase
      .from('stripe_webhook_events')
      .upsert(eventPayload, {
        onConflict: 'event_id', // If event_id already exists, update (but no fields change, so effectively no-op)
      });

    if (logError) {
      // Even if logging fails, we should return 200 to Stripe to prevent retries
      console.error('❌ Failed to log webhook event:', logError);
      return NextResponse.json(
        { received: true, logged: false, error: logError.message },
        { status: 200 } // Return 200 to prevent Stripe retry loop
      );
    }

    console.log(`✅ Event ${event.id} logged successfully`);


    // Process the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(supabase, session);
        break;
      }

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

    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('event_id', event.id);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // Log the error in the webhook events table
    await supabase
      .from('stripe_webhook_events')
      .update({
        error: error.message,
        processed_at: new Date().toISOString()
      })
      .eq('event_id', event.id);

    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout session completed events
 */
async function handleCheckoutSessionCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  // Extract customer and subscription IDs
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.warn('Missing customer or subscription ID in checkout session');
    return;
  }

  // Get user_id from session metadata
  const userId = session.metadata?.user_id || session.client_reference_id;

  if (!userId) {
    console.warn(`No user_id found in session ${session.id} metadata or client_reference_id`);
    return;
  }

  // Update user_subscriptions table with Stripe IDs
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(`Failed to update subscription for user ${userId}: ${updateError.message}`);
  }

  console.log(`✅ Synced checkout session ${session.id} for user ${userId} (customer: ${customerId}, subscription: ${subscriptionId})`);
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

  // Extract billing cycle from subscription items
  const price = subscription.items.data[0]?.price;
  let billingCycle = 'monthly'; // default
  if (price?.recurring) {
    billingCycle = price.recurring.interval === 'year' ? 'yearly' : 'monthly';
  }

  // Prepare update data
  const updateData: any = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    billing_cycle: billingCycle,
    cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
    updated_at: new Date().toISOString(),
  };

  // Add timestamps only if they exist and are valid
  if ((subscription as any).current_period_start) {
    updateData.current_period_start = new Date((subscription as any).current_period_start * 1000).toISOString();
  }
  if ((subscription as any).current_period_end) {
    updateData.current_period_end = new Date((subscription as any).current_period_end * 1000).toISOString();
  }

  // If subscription is cancelled, set cancelled_at
  if (subscription.status === 'canceled' && (subscription as any).canceled_at) {
    updateData.cancelled_at = new Date((subscription as any).canceled_at * 1000).toISOString();
  }

  // Update user_subscriptions table
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update(updateData)
    .eq('user_id', userSub.user_id);

  if (updateError) {
    console.error('❌ Failed to update subscription in DB:', {
      error: updateError,
      updateData,
      userId: userSub.user_id,
      subscriptionId: subscription.id
    });
    throw new Error(`Failed to update subscription: ${updateError.message}`);
  }

  console.log(`✅ Synced subscription ${subscription.id} for user ${userSub.user_id} (${eventType})`, {
    status: subscription.status,
    billing_cycle: billingCycle,
    cancel_at_period_end: (subscription as any).cancel_at_period_end
  });
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
