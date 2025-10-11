// Supabase Edge Function for Stripe Checkout Session Creation
import Stripe from 'npm:stripe@17.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-09-30.clover',
})

Deno.serve(async (req) => {
  // CORSヘッダー
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Preflightリクエスト処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authorization headerから認証トークンを取得
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '認証が必要です' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Supabaseクライアントで認証チェック
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '認証が必要です' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // リクエストボディを取得
    const body = await req.json()
    const { plan, billingPeriod } = body

    console.log('📋 Received checkout request:', {
      userId: user.id,
      plan,
      billingPeriod,
      email: user.email,
    })

    if (!plan || !billingPeriod) {
      return new Response(
        JSON.stringify({ error: 'プランと請求期間を指定してください' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Freemium plan doesn't require payment
    if (plan === 'freemium') {
      return new Response(
        JSON.stringify({ error: 'Freemiumプランは支払い不要です' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get the price ID from environment variables
    const priceId = billingPeriod === 'monthly'
      ? Deno.env.get('STRIPE_STANDARD_MONTHLY_PRICE_ID')
      : Deno.env.get('STRIPE_STANDARD_YEARLY_PRICE_ID')

    if (!priceId) {
      console.error('❌ Stripe price ID not configured:', { plan, billingPeriod })
      return new Response(
        JSON.stringify({ error: 'プラン設定が見つかりません' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('💳 Creating Stripe checkout session:', {
      priceId,
      userId: user.id,
      email: user.email,
    })

    // Origin URLを取得
    const origin = req.headers.get('origin') || Deno.env.get('APP_URL') || 'http://localhost:3000'

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment_success=true`,
      cancel_url: `${origin}/signup?payment_cancelled=true`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan: plan,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: plan,
        },
      },
    })

    console.log('✅ Checkout session created:', {
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })

    return new Response(
      JSON.stringify({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('❌ Stripe checkout session creation error:', error)
    return new Response(
      JSON.stringify({ error: 'チェックアウトセッションの作成に失敗しました' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
