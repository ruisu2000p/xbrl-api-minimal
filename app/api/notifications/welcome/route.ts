// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger, extractRequestId } from '@/utils/logger';
import { Resend } from 'resend';

// Initialize Resend only if API key is available (optional for build time)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Welcome Email Endpoint
 *
 * Sends a welcome email to newly registered users with their plan information.
 * This endpoint is idempotent - it will only send the email once per user.
 *
 * Flow:
 * 1. Authenticate user
 * 2. Check if welcome email already sent (idempotency)
 * 3. Fetch user's current subscription plan
 * 4. Send welcome email with plan details
 * 5. Log the email send event
 */
export async function POST(req: NextRequest) {
  try {
    // Extract request ID for log correlation
    await extractRequestId();

    // Get authenticated user from session cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      logger.warn('Welcome email: Unauthorized request', {
        path: '/api/notifications/welcome',
        err: authErr ? (authErr instanceof Error ? authErr : { message: String(authErr) }) : undefined
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Welcome email requested', {
      path: '/api/notifications/welcome',
      userId: user.id,
      email: user.email
    });

    // Idempotency check: has welcome email already been sent?
    const { data: alreadySent } = await supabase
      .from('welcome_email_log')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (alreadySent) {
      logger.debug('Welcome email already sent', {
        path: '/api/notifications/welcome',
        userId: user.id
      });
      return NextResponse.json({ ok: true, alreadySent: true });
    }

    // Get current subscription plan
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan_type, billing_cycle')
      .eq('user_id', user.id)
      .maybeSingle();

    const planType = subscription?.plan_type ?? 'freemium';
    const billingCycle = subscription?.billing_cycle ?? 'monthly';

    // Prepare email content
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fininfonext.com';
    const dashboardUrl = `${siteUrl}/dashboard`;

    // Plan display names
    const planDisplay: Record<string, { ja: string; en: string }> = {
      freemium: { ja: 'フリーミアム', en: 'Freemium' },
      standard: { ja: 'スタンダード', en: 'Standard' }
    };

    const billingDisplay: Record<string, { ja: string; en: string }> = {
      monthly: { ja: '月額', en: 'Monthly' },
      yearly: { ja: '年額', en: 'Yearly' }
    };

    const plan = planDisplay[planType] || { ja: planType, en: planType };
    const billing = billingDisplay[billingCycle] || { ja: billingCycle, en: billingCycle };

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">アカウント登録ありがとうございます</h2>
        <p style="color: #666; line-height: 1.6;">
          ${user.email} でアカウントが作成されました。
        </p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #333;">
            <strong>現在のプラン:</strong> ${plan.ja}（${billing.ja}）
          </p>
        </div>
        <p style="color: #666; line-height: 1.6;">
          ダッシュボードで詳細を確認できます：<br>
          <a href="${dashboardUrl}" style="color: #0066cc;">${dashboardUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <h2 style="color: #333;">Thank you for signing up</h2>
        <p style="color: #666; line-height: 1.6;">
          Your account has been created with ${user.email}.
        </p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #333;">
            <strong>Current plan:</strong> ${plan.en} (${billing.en})
          </p>
        </div>
        <p style="color: #666; line-height: 1.6;">
          Visit your dashboard:<br>
          <a href="${dashboardUrl}" style="color: #0066cc;">${dashboardUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2025 Financial Info Next. All rights reserved.
        </p>
      </div>
    `;

    // Send welcome email via Resend
    if (!resend) {
      logger.error('Resend API key not configured', {
        path: '/api/notifications/welcome',
        userId: user.id
      });
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    logger.info('Sending welcome email', {
      path: '/api/notifications/welcome',
      userId: user.id,
      email: user.email,
      meta: { planType, billingCycle }
    });

    await resend.emails.send({
      from: 'Financial Info Next <no-reply@mail.fininfonext.com>',
      to: user.email!,
      subject: 'ご登録ありがとうございます / Welcome to Financial Info Next',
      html,
    });

    // Log the email send event (idempotency flag)
    const { error: logErr } = await supabase
      .from('welcome_email_log')
      .insert({
        user_id: user.id,
        email: user.email!,
        plan_type: planType,
        billing_cycle: billingCycle,
      });

    if (logErr) {
      // Log failure but don't fail the request - user experience is preserved
      logger.warn('Welcome email log insert failed', {
        path: '/api/notifications/welcome',
        userId: user.id,
        err: logErr instanceof Error ? logErr : { message: String(logErr) }
      });
    } else {
      logger.info('Welcome email sent successfully', {
        path: '/api/notifications/welcome',
        userId: user.id,
        email: user.email
      });
    }

    return NextResponse.json({ ok: true, sent: true });

  } catch (error: any) {
    const msg = error?.message || 'Failed to send welcome email';
    logger.error('Welcome email error', {
      path: '/api/notifications/welcome',
      err: error instanceof Error ? error : { message: msg }
    });

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
