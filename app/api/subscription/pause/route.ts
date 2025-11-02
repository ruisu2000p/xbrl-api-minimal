// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createStripeClient } from '@/utils/stripe/client';
import { createServiceSupabaseClient } from '@/utils/supabase/unified-client';
import { createClient } from '@/utils/supabase/server';

type PauseBody = {
  behavior?: 'void' | 'mark_uncollectible' | 'keep_as_draft';
  resumesAt?: string; // ISO date or epoch seconds
  reason?: string;
};

/**
 * Pause subscription payment collection
 * Uses Stripe's pause_collection feature
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

    const { behavior = 'void', resumesAt, reason }: PauseBody = await req.json();
    const idempotencyKey = req.headers.get('idempotency-key')?.trim();

    console.log('⏸️ Pause subscription request:', {
      user_id: user.id,
      behavior,
      resumesAt,
      reason,
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

    if (subRow.is_paused) {
      return NextResponse.json({ error: 'Subscription is already paused' }, { status: 400 });
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

    // Calculate resume timestamp if provided
    let resumesAtEpoch: number | undefined;
    if (resumesAt) {
      resumesAtEpoch = /^\d+$/.test(resumesAt)
        ? Number(resumesAt)
        : Math.floor(new Date(resumesAt).getTime() / 1000);
    }

    console.log('🔄 Pausing Stripe subscription:', {
      subscriptionId,
      behavior,
      resumesAtEpoch,
      resumesAtISO: resumesAtEpoch ? new Date(resumesAtEpoch * 1000).toISOString() : null
    });

    // Update Stripe subscription with pause_collection
    const updated = await stripe.subscriptions.update(
      subscriptionId,
      {
        pause_collection: {
          behavior,
          ...(resumesAtEpoch ? { resumes_at: resumesAtEpoch } : {})
        },
        metadata: {
          paused_by: user.id,
          paused_at: new Date().toISOString(),
          pause_reason: reason ?? ''
        }
      },
      idempotencyKey ? { idempotencyKey: `${idempotencyKey}-pause` } : undefined
    );

    console.log('✅ Stripe subscription paused:', {
      id: updated.id,
      status: updated.status,
      pause_collection: updated.pause_collection
    });

    // Update DB (will be confirmed by webhook)
    const { error: updateError } = await adminSupabase
      .from('user_subscriptions')
      .update({
        is_paused: true,
        pause_behavior: behavior,
        pause_resumes_at: resumesAtEpoch
          ? new Date(resumesAtEpoch * 1000).toISOString()
          : null,
        paused_at: new Date().toISOString(),
        pause_reason: reason ?? null,
        pending_action: 'pause_collection',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('⚠️ Failed to update DB:', updateError);
      // Continue anyway - Stripe is already paused, webhook will sync
    }

    return NextResponse.json({
      success: true,
      subscriptionId,
      status: updated.status,
      pause_collection: updated.pause_collection
    });

  } catch (error: any) {
    const msg = error?.message || error?.raw?.message || 'Pause failed';
    console.error('❌ Pause subscription error:', {
      message: msg,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
