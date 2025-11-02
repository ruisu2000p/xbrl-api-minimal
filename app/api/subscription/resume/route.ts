// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient } from '@/utils/stripe/client';
import { createServiceSupabaseClient } from '@/utils/supabase/unified-client';
import { createClient } from '@/utils/supabase/server';

/**
 * Resume subscription payment collection
 * Clears Stripe's pause_collection setting
 */
export async function POST(req: NextRequest) {
  try {
    // CSRF validation
    const csrfHeader = req.headers.get('x-csrf-token') ?? '';
    const csrfCookie = (req.headers.get('cookie') ?? '')
      .split('; ')
      .find((r) => r.startsWith('csrf-token='))
      ?.split('=')[1] ?? '';

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      console.error('❌ CSRF validation failed');
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const idempotencyKey = req.headers.get('idempotency-key')?.trim();

    console.log('▶️ Resume subscription request:', {
      user_id: user.id,
      idempotency_key: idempotencyKey || '(none)'
    });

    const stripe = createStripeClient();
    const adminSupabase = await createServiceSupabaseClient();

    // Get subscription from DB
    const { data: subRow, error: subError } = await adminSupabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, is_paused, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError || !subRow) {
      console.error('❌ Subscription not found:', subError);
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (!subRow.is_paused) {
      return NextResponse.json({ error: 'Subscription is not paused' }, { status: 400 });
    }

    // Resolve Stripe subscription ID
    let subscriptionId = subRow.stripe_subscription_id as string | null;

    if (!subscriptionId && subRow.stripe_customer_id) {
      const list = await stripe.subscriptions.list({
        customer: subRow.stripe_customer_id,
        status: 'active',
        limit: 1
      });
      subscriptionId = list.data[0]?.id ?? null;
    }

    if (!subscriptionId) {
      console.warn('⚠️ No active Stripe subscription found');
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    console.log('🔄 Resuming Stripe subscription:', { subscriptionId });

    // Remove pause_collection from Stripe subscription
    const updated = await stripe.subscriptions.update(
      subscriptionId,
      {
        pause_collection: null as any, // Remove pause
        metadata: {
          resumed_by: user.id,
          resumed_at: new Date().toISOString()
        }
      },
      idempotencyKey ? { idempotencyKey: `${idempotencyKey}-resume` } : undefined
    );

    console.log('✅ Stripe subscription resumed:', {
      id: updated.id,
      status: updated.status
    });

    // Update DB (will be confirmed by webhook)
    const { error: updateError } = await adminSupabase
      .from('user_subscriptions')
      .update({
        is_paused: false,
        pause_behavior: null,
        pause_resumes_at: null,
        resumed_at: new Date().toISOString(),
        pending_action: 'resume_collection',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('⚠️ Failed to update DB:', updateError);
      // Continue anyway - Stripe is already resumed, webhook will sync
    }

    return NextResponse.json({
      success: true,
      subscriptionId,
      status: updated.status
    });

  } catch (error: any) {
    const msg = error?.message || error?.raw?.message || 'Resume failed';
    console.error('❌ Resume subscription error:', {
      message: msg,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
