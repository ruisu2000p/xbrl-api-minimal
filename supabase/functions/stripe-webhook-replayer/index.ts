// Supabase Edge Function: Stripe Webhook Replayer
//
// Purpose: 自己修復の保険 - 失敗イベントを再処理
//
// 機能:
// 1. 未処理/失敗イベントを取得（最大50件）
// 2. 保存した payload を使って同じハンドラで再処理
// 3. 成功したら processed=true に更新
// 4. 失敗したらエラーを記録
//
// 運用:
// - Supabase Scheduler で 5-10分おきに実行
// - 署名検証不要（保存済み payload を信頼）
// - べき等性により再実行は安全

import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.5.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-09-30.clover',
})

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 未処理/失敗イベントを取得（最大50件）
  const { data: events, error } = await supabase
    .from('stripe_webhook_events')
    .select('event_id, type, payload')
    .or('processed.is.false,error.is.not.null')
    .order('created_at', { ascending: true })
    .limit(50)

  if (error || !events?.length) {
    console.log('No pending events to replay')
    return new Response(JSON.stringify({ replayed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let successCount = 0
  let failCount = 0

  for (const e of events) {
    try {
      const event = e.payload as Stripe.Event

      // イベントタイプ別にハンドラを呼び出し
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

        case 'invoice.finalized': {
          const invoice = event.data.object as Stripe.Invoice
          await handleInvoiceFinalized(invoice, supabase)
          break
        }

        case 'credit_note.created': {
          const creditNote = event.data.object as Stripe.CreditNote
          await handleCreditNoteCreated(creditNote, supabase)
          break
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge
          await handleChargeRefunded(charge, supabase)
          break
        }

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      // 成功マーク
      await supabase
        .from('stripe_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error: null
        })
        .eq('event_id', e.event_id)

      successCount++
      console.log(`✅ Replayed ${e.event_id} (${e.type})`)

    } catch (err: any) {
      // 失敗を記録
      await supabase
        .from('stripe_webhook_events')
        .update({
          processed: false,
          error: String(err)
        })
        .eq('event_id', e.event_id)

      failCount++
      console.error(`❌ Failed to replay ${e.event_id}: ${err}`)
    }
  }

  return new Response(JSON.stringify({
    replayed: successCount + failCount,
    succeeded: successCount,
    failed: failCount
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})

// === ハンドラ関数（本体と同じロジック）===

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: any
) {
  if (session.mode !== 'subscription') return

  const userId = session.metadata?.user_id
  const plan = session.metadata?.plan
  const billingPeriod = session.metadata?.billing_period

  if (!userId || !plan) return

  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString()
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : new Date().toISOString()

  const { data: planData } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('name', plan)
    .single()

  if (!planData) return

  const { error } = await supabase.rpc('update_user_subscription_from_webhook', {
    p_user_id: userId,
    p_plan_id: planData.id,
    p_status: 'active',
    p_stripe_subscription_id: subscriptionId,
    p_stripe_customer_id: session.customer as string,
    p_current_period_start: currentPeriodStart,
    p_current_period_end: currentPeriodEnd,
    p_billing_cycle: billingPeriod || 'monthly',
  })

  if (error) throw error
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any) {
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

  if (error) throw error
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any) {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw error
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  const subscriptionId = (invoice.subscription as string) ||
                        (invoice as any).parent?.subscription_details?.subscription

  if (!subscriptionId) return

  const periodStart = invoice.period_start
    ? new Date(invoice.period_start * 1000).toISOString()
    : new Date().toISOString()
  const periodEnd = invoice.period_end
    ? new Date(invoice.period_end * 1000).toISOString()
    : new Date().toISOString()
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : null

  const { data: userId } = await supabase.rpc('get_user_id_from_subscription', {
    p_stripe_subscription_id: subscriptionId
  })

  if (userId) {
    await supabase.rpc('upsert_invoice_from_webhook', {
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
  }

  await supabase.rpc('update_subscription_status_from_webhook', {
    p_stripe_subscription_id: subscriptionId,
    p_status: 'active',
    p_current_period_start: periodStart,
    p_current_period_end: periodEnd,
    p_cancel_at_period_end: false,
  })
}

async function handleInvoiceFinalized(invoice: Stripe.Invoice, supabase: any) {
  console.log(`Invoice finalized: ${invoice.id}`)
}

async function handleCreditNoteCreated(creditNote: Stripe.CreditNote, supabase: any) {
  const deletionId = creditNote.metadata?.deletion_id
  const appUserId = creditNote.metadata?.app_user_id

  if (!deletionId || !appUserId) return

  // 返金額と通貨を取得（refund_amount がなければ amount を使用）
  const refundAmount = creditNote.refund_amount ?? 0
  const currency = (creditNote.currency || '').toLowerCase() // 'usd' | 'jpy'

  // 冪等更新: まだ未反映なら更新（自己修復）
  await supabase
    .from('account_deletions')
    .update({
      stripe_credit_note_id: creditNote.id,
      stripe_refund_amount: refundAmount,   // 最小通貨単位の整数
      stripe_currency: currency             // 'usd' or 'jpy'
    })
    .eq('id', deletionId)
    .is('stripe_credit_note_id', null)

  // 堅牢化: 既にIDは入っているが通貨/金額が空なら補完
  await supabase
    .from('account_deletions')
    .update({
      stripe_refund_amount: refundAmount,
      stripe_currency: currency
    })
    .eq('id', deletionId)
    .eq('stripe_credit_note_id', creditNote.id)
    .or('stripe_refund_amount.is.null,stripe_currency.is.null')
}

async function handleChargeRefunded(charge: Stripe.Charge, supabase: any) {
  console.log(`Charge refunded: ${charge.id}`)
}
