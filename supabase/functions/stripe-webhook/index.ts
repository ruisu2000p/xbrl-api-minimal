// Supabase Edge Function for Stripe Webhook
//
// "薄い実装": 同期処理はそのまま、Webhook で「ズレない・直せる・説明できる」を実現
//
// 機能:
// 1. 去重（event.id で重複チェック）
// 2. 監査トレイル（全イベントを stripe_webhook_events に保存）
// 3. 自己修復（エラー時は 500 で Stripe に再送させる）

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
      300, // 5分の tolerance（コールドスタート考慮、本番は必要に応じて短縮）
      cryptoProvider
    )
    console.log(`✅ Webhook verified: ${event.type}`)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // 1) livemode ガード（誤配送を無視）
  const EXPECT_LIVE = Deno.env.get('STRIPE_LIVEMODE') === 'true'
  if (event.livemode !== EXPECT_LIVE) {
    console.log(`⚠️ Ignoring ${event.livemode ? 'live' : 'test'} event in ${EXPECT_LIVE ? 'live' : 'test'} environment`)
    return new Response(JSON.stringify({ ignored: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 2) 去重 & 保存（署名検証直後、重い処理の前に実行）
  const idemKey = (event.request as any)?.idempotency_key ?? null
  const { error: insertError } = await supabase
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      type: event.type,
      created_at: new Date(event.created * 1000).toISOString(),
      request_id: (event.request as any)?.id ?? null,
      idempotency_key: idemKey,
      payload: event as any,
    })

  // 23505 = unique_violation (duplicate event_id)
  if (insertError?.code === '23505') {
    console.log(`✅ Duplicate event ${event.id}, skipping`)
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (insertError) {
    console.error('❌ Failed to insert webhook event:', insertError)
    return new Response('Database error', { status: 500 })
  }

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

      // === 新規追加：退会フロー用の4イベント ===

      case 'invoice.finalized': {
        // 最終インボイスが確定した合図（退会時の按分計算確定）
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoiceFinalized(invoice, supabase)
        break
      }

      case 'credit_note.created': {
        // 返金・クレジットが実行された事実の裏付け
        const creditNote = event.data.object as Stripe.CreditNote
        await handleCreditNoteCreated(creditNote, supabase)
        break
      }

      case 'charge.refunded': {
        // 実際に返金が決着した合図（部分/全額）
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
      .eq('event_id', event.id)

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error)

    // 失敗時はエラーを記録して 500 -> Stripe が自動リトライ
    await supabase
      .from('stripe_webhook_events')
      .update({
        processed: false,
        error: String(error)
      })
      .eq('event_id', event.id)

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
  // サブスクリプションモードのみ処理（一回払いは除外）
  if (session.mode !== 'subscription') {
    console.log(`Ignoring non-subscription checkout: ${session.mode}`)
    return
  }

  const userId = session.metadata?.user_id
  const plan = session.metadata?.plan
  const billingPeriod = session.metadata?.billing_period

  console.log('📋 Checkout session metadata:', {
    userId,
    plan,
    allMetadata: session.metadata,
  })

  if (!userId || !plan) {
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

  // Get plan ID from plan name
  const { data: planData } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('name', plan)
    .single()

  if (!planData) {
    console.error(`Plan '${plan}' not found`)
    return
  }

  // user_subscriptionsを更新（RPC経由でprivateスキーマにアクセス）
  const { error: updateError } = await supabase.rpc('update_user_subscription_from_webhook', {
    p_user_id: userId,
    p_plan_id: planData.id,
    p_status: 'active',
    p_stripe_subscription_id: subscriptionId,
    p_stripe_customer_id: session.customer as string,
    p_current_period_start: currentPeriodStart,
    p_current_period_end: currentPeriodEnd,
    p_billing_cycle: billingPeriod || 'monthly', // デフォルトはmonthly
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

// サブスクリプション削除時の処理（冪等に UPDATE - ズレの自己修復）
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  // 同期処理があるので冪等に UPDATE（ズレの自己修復）
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription status:', error)
    // 従来のロジックにフォールバック
    const { data: freemiumPlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'freemium')
      .single()

    if (freemiumPlan) {
      await supabase.rpc('cancel_user_subscription_from_webhook', {
        p_stripe_subscription_id: subscription.id,
        p_freemium_plan_id: freemiumPlan.id,
      })
    }
  }

  console.log(`✅ Subscription cancelled: ${subscription.id}`)
}

// 請求書支払い成功時の処理（継続課金）
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  // Stripe API 2025-09-30以降、subscriptionはparent.subscription_details.subscriptionに移動
  const subscriptionId = (invoice.subscription as string) ||
                        (invoice as any).parent?.subscription_details?.subscription

  console.log('📋 Invoice object:', {
    id: invoice.id,
    subscription: invoice.subscription,
    parentSubscription: (invoice as any).parent?.subscription_details?.subscription,
    subscriptionId: subscriptionId,
    hasSubscription: !!subscriptionId,
  })

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

// === 新規ハンドラ：退会フロー用 ===

// Invoice 確定時の処理
async function handleInvoiceFinalized(
  invoice: Stripe.Invoice,
  supabase: any
) {
  console.log(`📄 Invoice finalized: ${invoice.id}, total: ${invoice.total}, status: ${invoice.status}`)

  // 最終インボイスが確定した合図（退会時の按分計算確定）
  // 必要なら invoices テーブルへ upsert（監査や金額同期）
  // 最重処理は別ジョブ/後続へ回す（今は監査ログのみ）
}

// Credit Note 作成時の処理
async function handleCreditNoteCreated(
  creditNote: Stripe.CreditNote,
  supabase: any
) {
  console.log(`💳 Credit note created: ${creditNote.id}, amount: ${creditNote.amount}, refund_amount: ${creditNote.refund_amount}`)

  // metadata から deletion_id を取得して account_deletions を確認/更新
  const deletionId = creditNote.metadata?.deletion_id
  const appUserId = creditNote.metadata?.app_user_id

  if (!deletionId || !appUserId) {
    console.log('⚠️ Credit note missing deletion_id or app_user_id metadata, skipping')
    return
  }

  console.log(`🔗 Credit note linked to deletion: ${deletionId} (user: ${appUserId})`)

  // 返金額と通貨を取得（refund_amount がなければ amount を使用）
  const refundAmount = creditNote.refund_amount ?? 0
  const currency = (creditNote.currency || '').toLowerCase() // 'usd' | 'jpy'

  // 冪等更新: まだ未反映なら更新（自己修復）
  const { error: updateError1 } = await supabase
    .from('account_deletions')
    .update({
      stripe_credit_note_id: creditNote.id,
      stripe_refund_amount: refundAmount,   // 最小通貨単位の整数
      stripe_currency: currency             // 'usd' or 'jpy'
    })
    .eq('id', deletionId)
    .is('stripe_credit_note_id', null)

  if (updateError1) {
    console.error(`❌ Error updating account_deletions (first update):`, updateError1)
  } else {
    console.log(`✅ Updated account_deletions with credit_note_id: ${creditNote.id}`)
  }

  // 堅牢化: 既にIDは入っているが通貨/金額が空なら補完
  const { error: updateError2 } = await supabase
    .from('account_deletions')
    .update({
      stripe_refund_amount: refundAmount,
      stripe_currency: currency
    })
    .eq('id', deletionId)
    .eq('stripe_credit_note_id', creditNote.id)
    .or('stripe_refund_amount.is.null,stripe_currency.is.null')

  if (updateError2) {
    console.error(`❌ Error updating account_deletions (currency/amount補完):`, updateError2)
  }
}

// Charge 返金時の処理
async function handleChargeRefunded(
  charge: Stripe.Charge,
  supabase: any
) {
  console.log(`💰 Charge refunded: ${charge.id}, amount_refunded: ${charge.amount_refunded}`)

  // 実際に返金が決着した合図（部分/全額）
  // refunds テーブル upsert など（今は監査ログのみ）
}
