// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs'; // Stripe SDK requires Node.js runtime

import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

/**
 * エラーオブジェクトを文字列に変換（React #31 回避）
 */
function textError(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const any = err as any;
    return any.message ?? any.error ?? JSON.stringify(any);
  }
  return 'Unknown error';
}

/**
 * Stripe Customer Portal Session作成API
 *
 * Stripe Customer Portalを使用することで、ユーザーは安全に：
 * - サブスクリプションのアップグレード/ダウングレード
 * - 支払い方法の変更
 * - 請求履歴の確認
 * - サブスクリプションのキャンセル
 * を行うことができます。
 *
 * 利点：
 * - Stripe公式UIなので安全性が高い
 * - PCI DSS準拠
 * - 多言語対応
 * - 自動的にプロレーション計算
 */
export async function POST(request: NextRequest) {
  // ★ 1) Stripe Secret Key 存在チェック
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
    return NextResponse.json(
      { error: 'Stripe is not configured. Please contact support.' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secret, {
    apiVersion: '2024-11-20' as any,
  });

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('📋 Portal session request:', {
      userId: session.user.id,
      email: session.user.email,
    });

    // Get stripe_customer_id from DB
    const { data: userSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', session.user.id)
      .single();

    if (subError || !userSub?.stripe_customer_id) {
      console.error('❌ No Stripe customer found for user:', session.user.id, subError);
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe to a plan first.' },
        { status: 404 }
      );
    }

    // Get the origin for return URL
    const origin = request.headers.get('origin')
      || process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_BASE_URL
      || 'http://localhost:3000';

    const returnUrl = `${origin}/dashboard`;

    console.log('🔗 Portal return URL:', returnUrl);

    // Create Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userSub.stripe_customer_id,
      return_url: returnUrl,
    });

    console.log('✅ Portal session created:', {
      sessionId: portalSession.id,
      url: portalSession.url,
      customer: userSub.stripe_customer_id
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (error: any) {
    const errorMessage = textError(error);

    console.error('❌ Stripe portal session creation failed:', {
      error: errorMessage,
      name: error?.name,
      type: error?.type,
      statusCode: error?.statusCode,
      code: error?.code,
      stack: error?.stack,
      raw: error
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
