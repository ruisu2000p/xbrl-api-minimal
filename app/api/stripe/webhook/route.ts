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
 * Safe timestamp conversion helper
 * Prevents "Invalid time value" errors when converting Unix timestamps to ISO strings
 */
const toIsoOrNull = (sec?: number): string | null => {
  return typeof sec === 'number' && Number.isFinite(sec) && sec > 0
    ? new Date(sec * 1000).toISOString()
    : null;
};

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
 *
 * Supports two flows:
 * 1. Existing user changing plans (has user_id in metadata)
 * 2. New user signup via Pay→Create flow (has signup_email in metadata)
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

  // Determine flow type
  const isSignupFlow = session.metadata?.app_flow === 'signup_after_pay';
  const signupEmail = session.metadata?.signup_email || session.customer_details?.email || session.customer_email;
  const billingCycle = session.metadata?.billing_cycle || 'monthly';

  let userId = session.metadata?.user_id || session.client_reference_id;

  // Handle Pay→Create flow: Create user if this is a signup
  if (isSignupFlow && !userId && signupEmail) {
    console.log('🆕 Pay→Create flow detected - creating new user:', { email: signupEmail });

    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === signupEmail);

      if (existingUser) {
        console.log('✅ User already exists, reusing:', { user_id: existingUser.id });
        userId = existingUser.id;
      } else {
        // Create new user
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: signupEmail,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            stripe_customer_id: customerId,
            signup_flow: 'pay_first'
          }
        });

        if (createErr) {
          console.error('❌ Failed to create user:', createErr);
          throw new Error(`Failed to create user: ${createErr.message}`);
        }

        userId = created.user.id;
        console.log('✅ New user created:', { user_id: userId, email: signupEmail });

        // Send magic link for initial login
        try {
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: signupEmail,
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`
            }
          });

          if (linkError) {
            console.warn('⚠️ Failed to generate magic link (non-fatal):', linkError);
          } else {
            console.log('📧 Magic link generated for new user');
            // TODO: Send email with magic link using your email service
          }
        } catch (linkErr) {
          console.warn('⚠️ Magic link generation error (non-fatal):', linkErr);
        }
      }

      // Create/update profiles
      await supabase.from('profiles').upsert({
        id: userId,
        email: signupEmail,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      console.log('✅ Profile created/updated for new user');

    } catch (userCreationError: any) {
      console.error('❌ User creation failed:', userCreationError);
      throw new Error(`User creation failed: ${userCreationError.message}`);
    }
  }

  if (!userId) {
    console.warn(`No user_id found in session ${session.id} - cannot proceed`);
    return;
  }

  // Verify user still exists in Auth (may have been deleted)
  try {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      console.warn(`⚠️ User ${userId} no longer exists (probably deleted). Skipping checkout sync.`);
      return; // Return 200 OK to prevent Stripe retry
    }
  } catch (authCheckError) {
    console.warn(`⚠️ Failed to verify user existence for ${userId}:`, authCheckError);
    return; // Return 200 OK to prevent Stripe retry
  }

  // Check if this is a plan change (replacing an old subscription)
  const isPlanChange = session.metadata?.is_plan_change === 'true';
  const oldSubscriptionId = session.metadata?.old_subscription_id;

  if (isPlanChange && oldSubscriptionId) {
    console.log(`🔄 Plan change detected - canceling old subscription ${oldSubscriptionId}`);

    // Cancel the old subscription immediately
    const stripe = createStripeClient();
    try {
      await stripe.subscriptions.cancel(oldSubscriptionId);
      console.log(`✅ Canceled old subscription ${oldSubscriptionId}`);
    } catch (cancelError: any) {
      console.error(`⚠️ Failed to cancel old subscription ${oldSubscriptionId}:`, cancelError.message);
      // Continue anyway - new subscription is already created
    }
  }

  // Update or create user_subscriptions table
  const subscriptionData = {
    user_id: userId,
    plan_type: 'standard', // Pay→Create flow always creates Standard plan
    billing_cycle: billingCycle,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    status: 'active',
    access_state: 'active', // Active immediately after payment
    updated_at: new Date().toISOString()
  };

  const { error: upsertError } = await supabase
    .from('user_subscriptions')
    .upsert(subscriptionData, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('❌ Failed to upsert subscription:', upsertError);
    throw new Error(`Failed to update subscription for user ${userId}: ${upsertError.message}`);
  }

  console.log(`✅ Synced checkout session ${session.id} for user ${userId}`, {
    customer: customerId,
    subscription: subscriptionId,
    plan: 'standard',
    billing_cycle: billingCycle,
    is_signup_flow: isSignupFlow
  });
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
    .maybeSingle(); // Use maybeSingle to handle "not found" gracefully

  if (findError || !userSub) {
    console.warn(`⚠️ Webhook: subscription row not found for customer ${customerId}, probably deleted by account deletion. Skipping sync.`);
    // Return 200 OK to prevent Stripe from retrying
    return; // This is handled by the parent function which returns 200
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

  // Add timestamps using safe conversion helper
  const currentPeriodStart = toIsoOrNull((subscription as any).current_period_start);
  const currentPeriodEnd = toIsoOrNull((subscription as any).current_period_end);
  const canceledAt = toIsoOrNull((subscription as any).canceled_at);

  if (currentPeriodStart) {
    updateData.current_period_start = currentPeriodStart;
  }
  if (currentPeriodEnd) {
    updateData.current_period_end = currentPeriodEnd;
  }

  // If subscription is cancelled, set cancelled_at
  if (subscription.status === 'canceled' && canceledAt) {
    updateData.cancelled_at = canceledAt;
  }

  // Handle pause_collection status
  const pauseCollection = (subscription as any).pause_collection;
  if (pauseCollection) {
    updateData.is_paused = true;
    updateData.pause_behavior = pauseCollection.behavior || 'void';

    // Safe timestamp conversion for pause_resumes_at
    const pauseResumesAt = toIsoOrNull(pauseCollection.resumes_at);
    if (pauseResumesAt) {
      updateData.pause_resumes_at = pauseResumesAt;
    }

    // Clear pending_action if it was a pause operation
    if (eventType === 'customer.subscription.updated') {
      updateData.pending_action = null;
    }
  } else {
    // Payment collection resumed
    updateData.is_paused = false;
    updateData.pause_behavior = null;
    updateData.pause_resumes_at = null;
    // Clear pending_action if it was a resume operation
    if (eventType === 'customer.subscription.updated') {
      updateData.pending_action = null;
    }
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
