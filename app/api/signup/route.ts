// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/utils/supabase/unified-client';
import { logger, extractRequestId } from '@/utils/logger';

/**
 * Freemium Signup Endpoint
 *
 * Creates a new user account with Freemium plan (no payment required).
 * This is the traditional signup flow where user creates an account first.
 *
 * Flow:
 * 1. User provides email and password
 * 2. Supabase user is created immediately
 * 3. Email confirmation is sent (if configured)
 * 4. User gets Freemium plan access
 */
export async function POST(req: NextRequest) {
  try {
    // Extract request ID for log correlation
    await extractRequestId();

    // Parse request body
    const body = await req.json();
    const { email, password, name } = body;

    // Validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
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

    // Password strength validation (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = await createServiceSupabaseClient();

    logger.info('Creating freemium user', {
      path: '/api/signup',
      email,
      meta: { hasName: !!name }
    });

    // Create user with Supabase Auth
    // Using signUp() instead of admin.createUser() to trigger automatic confirmation email
    const { data: created, error: createError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
          signup_flow: 'freemium'
        }
      }
    });

    if (createError) {
      logger.error('User creation failed', {
        path: '/api/signup',
        email,
        err: createError instanceof Error ? createError : { message: String(createError) }
      });

      // Handle duplicate user error
      if (createError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    const userId = created.user?.id;
    if (!userId) {
      logger.error('User ID not found after signup', {
        path: '/api/signup',
        email
      });
      return NextResponse.json(
        { error: 'Signup failed - no user ID returned' },
        { status: 500 }
      );
    }

    logger.info('User created successfully', {
      path: '/api/signup',
      userId,
      email
    });

    // Create profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      full_name: name || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (profileError) {
      logger.warn('Profile creation failed (non-fatal)', {
        path: '/api/signup',
        userId,
        err: profileError instanceof Error ? profileError : { message: String(profileError) }
      });
    } else {
      logger.info('Profile created', {
        path: '/api/signup',
        userId
      });
    }

    // Create freemium subscription
    const { error: subscriptionError } = await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      plan_type: 'freemium',
      billing_cycle: 'monthly', // Not used for freemium, but required field
      status: 'active',
      access_state: 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (subscriptionError) {
      logger.warn('Subscription creation failed (non-fatal)', {
        path: '/api/signup',
        userId,
        err: subscriptionError instanceof Error ? subscriptionError : { message: String(subscriptionError) }
      });
    } else {
      logger.info('Freemium subscription created', {
        path: '/api/signup',
        userId,
        meta: { planType: 'freemium' }
      });
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      message: '確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。'
    });

  } catch (error: any) {
    const msg = error?.message || 'Signup failed';
    logger.error('Freemium signup error', {
      path: '/api/signup',
      err: error instanceof Error ? error : { message: msg }
    });

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
