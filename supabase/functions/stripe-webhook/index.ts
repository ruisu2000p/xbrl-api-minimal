// Supabase Edge Function for Stripe Webhook
import Stripe from 'npm:stripe@17.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-09-30.clover',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature provided', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider
    )
    console.log(`✅ Webhook verified: ${event.type}`)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, stripe, supabase)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription, supabase)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, supabase)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice, supabase)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Checkout完了時の処理
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: any
) {
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId

  if (!userId || !planId) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Stripeのサブスクリプション情報を取得
  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // 日付を安全に処理
  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString()
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : new Date().toISOString()

  // user_subscriptionsを更新（RPC経由でprivateスキーマにアクセス）
  const { error: updateError } = await supabase.rpc('update_user_subscription_from_webhook', {
    p_user_id: userId,
    p_plan_id: planId,
    p_status: 'active',
    p_stripe_subscription_id: subscriptionId,
    p_stripe_customer_id: session.customer as string,
    p_current_period_start: currentPeriodStart,
    p_current_period_end: currentPeriodEnd,
  })

  if (updateError) {
    console.error('Error updating subscription:', updateError)
    throw updateError
  }

  console.log(`✅ Subscription activated for user ${userId}`)
}

// サブスクリプション更新時の処理
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  // 日付を安全に処理
  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString()
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : new Date().toISOString()

  const { error } = await supabase.rpc('update_subscription_status_from_webhook', {
    p_stripe_subscription_id: subscription.id,
    p_status: subscription.status,
    p_current_period_start: currentPeriodStart,
    p_current_period_end: currentPeriodEnd,
    p_cancel_at_period_end: subscription.cancel_at_period_end || false,
  })

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  console.log(`✅ Subscription updated: ${subscription.id}`)
}

// サブスクリプション削除時の処理
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  // Freemiumプランに戻す
  const { data: freemiumPlan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('name', 'freemium')
    .single()

  if (!freemiumPlan) {
    console.error('Freemium plan not found')
    return
  }

  const { error } = await supabase.rpc('cancel_user_subscription_from_webhook', {
    p_stripe_subscription_id: subscription.id,
    p_freemium_plan_id: freemiumPlan.id,
  })

  if (error) {
    console.error('Error cancelling subscription:', error)
    throw error
  }

  console.log(`✅ Subscription cancelled: ${subscription.id}`)
}

// 請求書支払い成功時の処理（継続課金）
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    console.log('Invoice has no subscription, skipping')
    return
  }

  // 日付を安全に処理
  const periodStart = invoice.period_start
    ? new Date(invoice.period_start * 1000).toISOString()
    : new Date().toISOString()
  const periodEnd = invoice.period_end
    ? new Date(invoice.period_end * 1000).toISOString()
    : new Date().toISOString()
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : null

  // サブスクリプションからユーザーIDを取得（RPC経由）
  console.log(`🔍 Looking up user for subscription: ${subscriptionId}`)
  const { data: userId, error: userIdError } = await supabase.rpc(
    'get_user_id_from_subscription',
    { p_stripe_subscription_id: subscriptionId }
  )

  console.log(`📝 RPC result - userId: ${userId}, error:`, userIdError)

  if (userIdError || !userId) {
    console.error('❌ Subscription not found for invoice:', invoice.id, userIdError)
  } else {
    // 請求書情報を保存
    console.log(`💾 Saving invoice: ${invoice.id} for user: ${userId}`)
    const { error: invoiceError } = await supabase.rpc('upsert_invoice_from_webhook', {
      p_user_id: userId,
      p_stripe_invoice_id: invoice.id,
      p_stripe_subscription_id: subscriptionId,
      p_amount_due: invoice.amount_due,
      p_amount_paid: invoice.amount_paid,
      p_currency: invoice.currency,
      p_status: invoice.status,
      p_invoice_pdf: invoice.invoice_pdf,
      p_hosted_invoice_url: invoice.hosted_invoice_url,
      p_billing_reason: invoice.billing_reason,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_paid_at: paidAt,
    })

    if (invoiceError) {
      console.error('❌ Error saving invoice:', invoiceError)
    } else {
      console.log(`✅ Invoice saved successfully: ${invoice.id}`)
    }
  }

  // サブスクリプションの期間を更新
  const { error } = await supabase.rpc('update_subscription_status_from_webhook', {
    p_stripe_subscription_id: subscriptionId,
    p_status: 'active',
    p_current_period_start: periodStart,
    p_current_period_end: periodEnd,
    p_cancel_at_period_end: false,
  })

  if (error) {
    console.error('Error updating subscription from invoice:', error)
    throw error
  }

  console.log(`✅ Subscription renewed via invoice: ${subscriptionId}`)
}
