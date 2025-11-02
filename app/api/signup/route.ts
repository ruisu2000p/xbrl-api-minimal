// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/utils/supabase/unified-client';

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

    console.log('📝 Creating freemium user:', { email });

    // Create user with Supabase Auth
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Send confirmation email
      user_metadata: {
        name: name || null,
        signup_flow: 'freemium'
      }
    });

    if (createError) {
      console.error('❌ User creation failed:', createError);

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

    const userId = created.user.id;
    console.log('✅ User created:', { user_id: userId });

    // Create profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      full_name: name || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (profileError) {
      console.error('⚠️ Profile creation failed (non-fatal):', profileError);
    } else {
      console.log('✅ Profile created');
    }

    // Create freemium subscription
    const { error: subscriptionError } = await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      plan_id: 'freemium',
      billing_cycle: 'monthly', // Not used for freemium, but required field
      status: 'active',
      access_state: 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (subscriptionError) {
      console.error('⚠️ Subscription creation failed (non-fatal):', subscriptionError);
    } else {
      console.log('✅ Freemium subscription created');
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      message: '確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。'
    });

  } catch (error: any) {
    const msg = error?.message || 'Signup failed';
    console.error('❌ Freemium signup error:', {
      message: msg,
      error
    });

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
