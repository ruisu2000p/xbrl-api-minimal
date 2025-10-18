// Phase 3: Email bounce/complaint webhook handler
// Supports: SendGrid, AWS SES (via SNS), Postmark
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EventWebhook } from '@sendgrid/eventwebhook'
import crypto from 'crypto'
import SnsValidator from 'sns-validator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SKIP_VERIFY = process.env.WEBHOOK_SKIP_VERIFY === 'true' // 開発向け。本番は false に！

async function markStatus(
  email: string,
  status: 'bounced' | 'complained',
  provider: string,
  eventId?: string
) {
  try {
    // Idempotency check: 重複イベントを防ぐ
    if (eventId) {
      const { error: dup } = await admin
        .from('mail_event_log')
        .insert({ provider, event_id: eventId, email })

      if (dup) {
        console.log(`[${provider}] Duplicate event ${eventId} for ${email}, skipping`)
        return // 重複なら終了（unique違反）
      }
    }

    // profiles の email_status を更新
    const { error: updateError } = await admin
      .from('profiles')
      .update({ email_status: status })
      .eq('email', email)

    if (updateError) {
      console.error(`[${provider}] Failed to update email_status for ${email}:`, updateError)
    } else {
      console.log(`[${provider}] Marked ${email} as ${status}`)
    }
  } catch (error) {
    console.error(`[${provider}] Error in markStatus:`, error)
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const providerParam = url.searchParams.get('provider') // 明示指定も可
  const raw = await req.text()
  const headers = Object.fromEntries(req.headers.entries())

  try {
    // ---- SendGrid（Twilio SendGrid Event Webhook）----
    if (
      providerParam === 'sendgrid' ||
      headers['x-twilio-email-event-webhook-signature']
    ) {
      console.log('[SendGrid] Processing webhook...')

      if (!SKIP_VERIFY) {
        const pub = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY
        if (!pub) {
          console.error('[SendGrid] SENDGRID_WEBHOOK_PUBLIC_KEY not set')
          return NextResponse.json(
            { ok: false, error: 'Configuration error' },
            { status: 500 }
          )
        }

        const sig = headers['x-twilio-email-event-webhook-signature']
        const ts = headers['x-twilio-email-event-webhook-timestamp']

        if (!sig || !ts) {
          console.error('[SendGrid] Missing signature or timestamp')
          return NextResponse.json(
            { ok: false, error: 'Missing signature headers' },
            { status: 401 }
          )
        }

        const ew = new EventWebhook()
        const ok = ew.verifySignature(pub, raw, sig, ts)

        if (!ok) {
          console.error('[SendGrid] Signature verification failed')
          return NextResponse.json(
            { ok: false, error: 'Invalid signature' },
            { status: 401 }
          )
        }
      }

      const events = JSON.parse(raw)
      const eventArray = Array.isArray(events) ? events : [events]

      for (const ev of eventArray) {
        const email = ev.email as string
        const event = ev.event as string // 'bounce' | 'spamreport' など
        const eventId = ev.sg_event_id as string | undefined

        if (event === 'bounce') {
          await markStatus(email, 'bounced', 'sendgrid', eventId)
        }
        if (event === 'spamreport') {
          await markStatus(email, 'complained', 'sendgrid', eventId)
        }
      }

      return NextResponse.json({ ok: true, processed: eventArray.length })
    }

    // ---- Postmark Webhook ----
    if (providerParam === 'postmark' || headers['x-postmark-signature']) {
      console.log('[Postmark] Processing webhook...')

      if (!SKIP_VERIFY) {
        const token = process.env.POSTMARK_WEBHOOK_TOKEN
        if (!token) {
          console.error('[Postmark] POSTMARK_WEBHOOK_TOKEN not set')
          return NextResponse.json(
            { ok: false, error: 'Configuration error' },
            { status: 500 }
          )
        }

        const expected = crypto.createHmac('sha256', token).update(raw).digest('base64')
        const provided = headers['x-postmark-signature']

        if (!provided) {
          console.error('[Postmark] Missing signature header')
          return NextResponse.json(
            { ok: false, error: 'Missing signature' },
            { status: 401 }
          )
        }

        const safeEq = crypto.timingSafeEqual(
          Buffer.from(expected),
          Buffer.from(provided)
        )

        if (!safeEq) {
          console.error('[Postmark] Signature verification failed')
          return NextResponse.json(
            { ok: false, error: 'Invalid signature' },
            { status: 401 }
          )
        }
      }

      const body = JSON.parse(raw)

      // RecordType: 'Bounce' | 'SpamComplaint'
      if (body.RecordType === 'Bounce') {
        await markStatus(body.Email, 'bounced', 'postmark', String(body.ID ?? ''))
      }
      if (body.RecordType === 'SpamComplaint') {
        await markStatus(body.Email, 'complained', 'postmark', String(body.ID ?? ''))
      }

      return NextResponse.json({ ok: true })
    }

    // ---- AWS SES（SNS 経由）----
    if (providerParam === 'ses' || headers['x-amz-sns-message-type']) {
      console.log('[SES/SNS] Processing webhook...')

      const msg = JSON.parse(raw)

      if (!SKIP_VERIFY) {
        const validator = new SnsValidator()
        await new Promise<void>((resolve, reject) =>
          validator.validate(msg, (err: Error | null) => (err ? reject(err) : resolve()))
        )
      }

      // SNS サブスクリプション確認
      if (msg.Type === 'SubscriptionConfirmation' && msg.SubscribeURL) {
        console.log('[SES/SNS] Confirming subscription...')
        const r = await fetch(msg.SubscribeURL)

        if (!r.ok) {
          console.error('[SES/SNS] Subscription confirmation failed')
          throw new Error('SNS subscription confirm failed')
        }

        console.log('[SES/SNS] Subscription confirmed')
        return NextResponse.json({ ok: true, subscribed: true })
      }

      // 通知メッセージ処理
      if (msg.Type === 'Notification' && msg.Message) {
        const inner = JSON.parse(msg.Message)

        if (inner.notificationType === 'Bounce') {
          for (const rec of inner.bounce.bouncedRecipients || []) {
            await markStatus(
              rec.emailAddress,
              'bounced',
              'ses',
              inner.mail?.messageId
            )
          }
        }

        if (inner.notificationType === 'Complaint') {
          for (const rec of inner.complaint.complainedRecipients || []) {
            await markStatus(
              rec.emailAddress,
              'complained',
              'ses',
              inner.mail?.messageId
            )
          }
        }
      }

      return NextResponse.json({ ok: true })
    }

    // プロバイダーが識別できない場合
    console.error('[Webhook] Unknown provider', { headers, providerParam })
    return NextResponse.json(
      { ok: false, error: 'Unknown provider' },
      { status: 400 }
    )
  } catch (e: any) {
    console.error('[Webhook] Error processing email bounce webhook:', e)
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Internal error' },
      { status: 500 }
    )
  }
}
