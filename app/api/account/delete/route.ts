// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/utils/supabase/unified-client';
import { createApiResponse, ErrorCodes } from '@/lib/utils/api-response-v2';
// import { logSecurityEvent } from '@/utils/security/audit-log'; // Commented out - audit_logs table doesn't exist
import Stripe from 'stripe';
import crypto from 'crypto';

// Stripeクライアントを遅延初期化（ビルド時のエラーを回避）
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover',
  });
}

/**
 * 退会 API
 *
 * べき等性保証、Stripe 即時キャンセル + 返金、Auth BAN、30日猶予期間を実装
 *
 * フロー:
 * 1. べき等性チェック（Idempotency-Key）
 * 2. パスワード再検証（重要操作のため）
 * 3. Stripe サブスクリプション即時キャンセル + 返金
 *    - サブスクリプションを即座に終了（期末ではなく現在時点で）
 *    - Stripeが自動的に按分計算を実施
 *    - 返金が必要な場合、Credit Note で自動返金
 * 4. データベース論理削除（user_subscriptions, api_keys, account_deletions）
 * 5. Auth ユーザーに BAN フラグ設定（ログイン抑止）
 * 6. 監査ログ記録
 * 7. セッション無効化（ログアウト）
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック（middleware で実施済み）
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return createApiResponse.error(
        ErrorCodes.UNAUTHORIZED,
        '認証が必要です'
      );
    }

    // 2. べき等性チェック（Idempotency-Key ヘッダー必須）
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return createApiResponse.error(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        'Idempotency-Key ヘッダーが必要です'
      );
    }

    // べき等性確認（同一キーでの過去の処理をチェック）
    const adminSupabase = await createServiceSupabaseClient();
    const { data: existingDeletion } = await adminSupabase
      .from('account_deletions')
      .select('id, deleted_at')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingDeletion) {
      // すでに処理済み - 前回の結果を返す（べき等）
      return createApiResponse.success({
        message: '退会処理はすでに完了しています',
        deletionId: existingDeletion.id,
        deletedAt: existingDeletion.deleted_at
      });
    }

    // 3. リクエストボディ検証
    const body = await request.json();
    const { password, reason, comment } = body;

    if (!password) {
      return createApiResponse.error(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        'パスワードが必要です'
      );
    }

    // 4. パスワード再検証（重要操作のため）
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password
    });

    if (authError) {
      // Commented out - audit_logs table doesn't exist
      // await logSecurityEvent({
      //   type: 'account_deletion',
      //   outcome: 'fail',
      //   email: user.email!,
      //   ip: request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      //   ua: request.headers.get('user-agent'),
      //   details: { reason: 'password_verification_failed' }
      // });

      return createApiResponse.error(
        ErrorCodes.INVALID_CREDENTIALS,
        'パスワードが正しくありません'
      );
    }

    // 5. 現在のサブスクリプション情報を取得
    // 注: user_subscriptions は private スキーマなので RPC 関数を使用
    // RPC関数(SECURITY DEFINER)により、確実にprivateスキーマにアクセス可能
    const { data: subData, error: subError } = await adminSupabase
      .rpc('get_user_subscription_snapshot', { user_uuid: user.id });

    const subRow = subData && subData.length > 0 ? subData[0] : null;

    console.log('📊 Subscription query result (via RPC):', {
      hasSubscription: !!subRow,
      stripe_subscription_id: subRow?.stripe_subscription_id,
      stripe_customer_id: subRow?.stripe_customer_id,
      status: subRow?.status,
      error: subError?.message
    });

    // 5-1. Stripe から補完（RPC失敗時の安全策）
    let stripeCustomerId = subRow?.stripe_customer_id ?? null;
    let stripeSubscriptionId = subRow?.stripe_subscription_id ?? null;

    // RPC が失敗した場合、user_subscriptions テーブルを直接取得（admin権限）
    // （RPC関数が未作成の場合のfallback）
    if (!stripeCustomerId && !stripeSubscriptionId) {
      console.log('⚠️ RPC failed, attempting direct query fallback...');
      const { data: directData } = await adminSupabase
        .from('user_subscriptions')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (directData) {
        stripeCustomerId = directData.stripe_customer_id;
        stripeSubscriptionId = directData.stripe_subscription_id;
        console.log('✅ Fallback: Retrieved IDs from direct query:', {
          stripeCustomerId,
          stripeSubscriptionId
        });
      }
    }

    // 最終手段: Stripe API から customer の全 subscription を取得
    if (!stripeSubscriptionId && stripeCustomerId) {
      try {
        console.log('🔄 Final fallback: Querying Stripe API...');
        const stripe = getStripeClient();
        const list = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
          limit: 1
        });
        stripeSubscriptionId = list.data[0]?.id ?? null;
        console.log('✅ Fallback: Retrieved subscription_id from Stripe:', stripeSubscriptionId);
      } catch (err: any) {
        console.error('⚠️ Failed to retrieve subscription from Stripe:', err.message);
      }
    }

    // 後方互換性のため subscription オブジェクトを構築
    const subscription = subRow ? {
      ...subRow,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId
    } : null;

    // 5-1. Webhook 同期待機チェック（Race Condition 対策）
    // Stripe Checkout 完了直後は Webhook による stripe_subscription_id の同期を待つ必要がある
    if (subscription && !subscription.stripe_subscription_id) {
      // サブスクリプションデータは存在するが stripe_subscription_id が未設定
      const createdAt = new Date(subscription.created_at);
      const now = new Date();
      const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;

      // 作成から60秒以内の場合は Webhook 同期中と判断
      if (secondsSinceCreation < 60) {
        console.log('⏳ Waiting for Webhook synchronization:', {
          seconds_since_creation: secondsSinceCreation,
          created_at: subscription.created_at,
          message: 'Subscription data exists but stripe_subscription_id is not yet synced'
        });

        // Commented out - audit_logs table doesn't exist
        // await logSecurityEvent({
        //   type: 'account_deletion',
        //   outcome: 'fail',
        //   email: user.email!,
        //   ip: request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        //   ua: request.headers.get('user-agent'),
        //   details: {
        //     reason: 'webhook_sync_pending',
        //     seconds_since_creation: secondsSinceCreation
        //   }
        // });

        return createApiResponse.error(
          ErrorCodes.INTERNAL_ERROR,
          'サブスクリプション情報の同期処理中です。1分ほど待ってから再度お試しください。'
        );
      }
    }

    // 6. Stripe サブスクリプション即時キャンセル + 返金処理（該当する場合）
    let stripeInvoiceId = null;
    let refundAmount = 0;
    let stripeRefundId = null;
    let stripeCurrency = 'jpy'; // デフォルト通貨（JPY）

    // Stripe補完後のIDを使用（DBから取得できなくてもStripe APIから補完済み）
    if (stripeSubscriptionId) {
      console.log('🔄 Starting Stripe subscription cancellation:', {
        subscription_id: stripeSubscriptionId,
        customer_id: stripeCustomerId,
        idempotency_key: idempotencyKey,
        source: subRow ? 'database' : 'stripe_api_fallback'
      });

      try {
        const stripe = getStripeClient();
        const subId = stripeSubscriptionId;

        // 6-1. Stripe 即時キャンセル（返金は後で別途実行）
        // subscriptions.cancel() はデフォルトで即時キャンセルを実行する
        // prorate: false - 返金は後で refundUnusedAmount() で実行するため
        console.log('📞 Calling stripe.subscriptions.cancel (immediate)...');
        const canceledSubscription = await stripe.subscriptions.cancel(
          subId,
          {
            prorate: false,  // 返金は別途実行するため無効化
            cancellation_details: {
              feedback: mapReasonToStripeFeedback(reason),
              comment: comment || undefined
            }
          },
          {
            idempotencyKey: idempotencyKey // べき等性を Stripe にも伝播
          }
        );

        stripeSubscriptionId = canceledSubscription.id;
        stripeCustomerId = typeof canceledSubscription.customer === 'string'
          ? canceledSubscription.customer
          : canceledSubscription.customer?.id;

        console.log('✅ Stripe subscription cancelled successfully:', {
          subscription_id: canceledSubscription.id,
          customer_id: stripeCustomerId,
          status: canceledSubscription.status,
          canceled_at: canceledSubscription.canceled_at,
          cancel_at: canceledSubscription.cancel_at,
          cancel_at_period_end: canceledSubscription.cancel_at_period_end
        });

        // 6-3. Subscription Schedule がアタッチされている場合は、それもキャンセル
        // (Subscription Schedules はフェーズ管理を行うため、別途キャンセルが必要)
        if (canceledSubscription.schedule && typeof canceledSubscription.schedule === 'string') {
          try {
            console.log('📅 Canceling attached Subscription Schedule:', canceledSubscription.schedule);
            await stripe.subscriptionSchedules.cancel(
              canceledSubscription.schedule,
              undefined,
              {
                idempotencyKey: `${idempotencyKey}-schedule`
              }
            );
            console.log('✅ Subscription Schedule cancelled successfully');
          } catch (scheduleError: any) {
            // Schedule が既にキャンセル済み、または存在しない場合はログのみ
            console.warn('⚠️ Failed to cancel Subscription Schedule (may already be canceled):', scheduleError.message);
          }
        }

        // 6-2. 未使用分を計算して返金を実行
        // Stripe の proration preview を使用して正確な按分計算を行う
        console.log('💰 Starting refund calculation and processing...');

        const refundResult = await refundUnusedAmount(
          stripe,
          stripeSubscriptionId,
          idempotencyKey
        );

        refundAmount = refundResult.refundAmount;
        stripeCurrency = refundResult.currency;
        stripeRefundId = refundResult.refundId;

        // 最新インボイスIDを取得（追跡用）
        if (canceledSubscription.latest_invoice) {
          stripeInvoiceId = typeof canceledSubscription.latest_invoice === 'string'
            ? canceledSubscription.latest_invoice
            : canceledSubscription.latest_invoice.id;
        }

        console.log('✅ Refund processing completed:', {
          refund_amount: refundAmount,
          refund_amount_dollars: (refundAmount / 100).toFixed(2),
          currency: stripeCurrency,
          refund_id: stripeRefundId,
          invoice_id: stripeInvoiceId
        });
      } catch (stripeError: any) {
        console.error('❌ Stripe subscription cancellation/refund failed:', {
          error_message: stripeError.message,
          error_type: stripeError.type,
          error_code: stripeError.code,
          subscription_id: stripeSubscriptionId,
          customer_id: stripeCustomerId,
          stack: stripeError.stack
        });

        // Stripe エラーの場合、データベース更新を続行せずエラーを返す
        // 返金処理が失敗した場合、ユーザーに通知して手動対応を促す
        // Commented out - audit_logs table doesn't exist
        // await logSecurityEvent({
        //   type: 'account_deletion',
        //   outcome: 'fail',
        //   email: user.email!,
        //   ip: request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        //   ua: request.headers.get('user-agent'),
        //   details: {
        //     reason: 'stripe_cancellation_failed',
        //     stripe_error: stripeError.message,
        //     stripe_error_type: stripeError.type,
        //     stripe_error_code: stripeError.code,
        //     subscription_id: stripeSubscriptionId
        //   }
        // });

        return createApiResponse.error(
          ErrorCodes.INTERNAL_ERROR,
          'Stripeサブスクリプションのキャンセルに失敗しました。お手数ですがサポートまでお問い合わせください。'
        );
      }
    } else {
      console.error('⚠️ No Stripe subscription to cancel:', {
        user_id: user.id,
        db_row_found: !!subRow,
        db_error: subError?.message,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        message: 'DB取得失敗 → Stripe API補完も失敗した可能性があります'
      });
    }

    // 7. データベース論理削除
    const deletedAt = new Date();
    const permanentDeletionAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30日後

    // 7-1. user_subscriptions 更新
    const { error: subscriptionError } = await adminSupabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: deletedAt.toISOString()
      })
      .eq('user_id', user.id);

    if (subscriptionError) {
      console.error('Failed to update user_subscriptions:', subscriptionError);
      // サブスクリプション更新失敗でも処理は続行（手動対応可能）
    }

    // 7-2. api_keys 無効化
    const { error: apiKeysError } = await adminSupabase
      .from('api_keys')
      .update({
        revoked: true,
        revoked_at: deletedAt.toISOString()
      })
      .eq('user_id', user.id);

    if (apiKeysError) {
      console.error('Failed to revoke api_keys:', apiKeysError);
      // API キー無効化失敗でも処理は続行（手動対応可能）
    }

    // 7-3. account_deletions レコード作成
    const emailHash = crypto.createHash('sha256').update(user.email!.toLowerCase()).digest('hex');

    const { data: deletionRecord, error: deletionError } = await adminSupabase
      .from('account_deletions')
      .insert({
        user_id: user.id,
        email: user.email!,
        email_hash: emailHash,
        idempotency_key: idempotencyKey,
        reason,
        comment,
        deleted_at: deletedAt.toISOString(),
        permanent_deletion_at: permanentDeletionAt.toISOString(),
        subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        stripe_invoice_id: stripeInvoiceId,
        stripe_refund_id: stripeRefundId,
        stripe_refund_amount: refundAmount,
        stripe_currency: stripeCurrency,
        plan_at_deletion: stripeSubscriptionId ? 'standard' : 'freemium'
      })
      .select('id')
      .single();

    if (deletionError) {
      console.error('Failed to create account_deletions record:', deletionError);
      return createApiResponse.error(
        ErrorCodes.INTERNAL_ERROR,
        '退会処理中にエラーが発生しました'
      );
    }

    // 7-4. Refund の metadata を更新（deletion_id を紐付け）
    if (stripeRefundId && deletionRecord?.id) {
      try {
        const stripe = getStripeClient();
        await stripe.refunds.update(stripeRefundId, {
          metadata: {
            app_user_id: user.id,
            deletion_id: deletionRecord.id,
            idempotency_key: idempotencyKey,
            reason: reason
          }
        });
      } catch (metadataError) {
        console.error('Failed to update Refund metadata:', metadataError);
        // metadata 更新失敗は致命的ではない（手動で紐付け可能）
      }
    }

    // 8. Auth ユーザーに BAN 設定（ログイン抑止 - 30日猶予期間）
    // Supabase 公式の ban_duration を使用してログイン/リフレッシュを完全に抑止
    try {
      await adminSupabase.auth.admin.updateUserById(user.id, {
        ban_duration: '720h'  // 30日 = 720時間
      });
    } catch (banError) {
      console.error('Failed to ban user:', banError);
      // BAN 失敗でもログアウトで対応可能
    }

    // 9. 監査ログ記録
    // Commented out - audit_logs table doesn't exist
    // await logSecurityEvent({
    //   type: 'account_deletion',
    //   outcome: 'success',
    //   email: user.email!,
    //   ip: request.ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    //   ua: request.headers.get('user-agent'),
    //   details: {
    //     deletion_id: deletionRecord.id,
    //     reason,
    //     subscription_id: stripeSubscriptionId,
    //     stripe_invoice_id: stripeInvoiceId,
    //     stripe_refund_id: stripeRefundId,
    //     permanent_deletion_at: permanentDeletionAt.toISOString(),
    //     refund_amount: refundAmount > 0 ? refundAmount : undefined
    //   }
    // });

    // 10. セッション無効化（ログアウト）
    await supabase.auth.signOut();

    return createApiResponse.success({
      message: '退会処理が完了しました。30日以内であれば復元が可能です。',
      deletionId: deletionRecord.id,
      deletedAt: deletedAt.toISOString(),
      permanentDeletionAt: permanentDeletionAt.toISOString()
    });

  } catch (error: any) {
    console.error('❌ Account deletion error:', {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack
    });
    return createApiResponse.internalError(
      error,
      '退会処理中にエラーが発生しました'
    );
  }
}

/**
 * 退会理由を Stripe の feedback enum にマッピング
 * Stripe API 2025-09-30.clover では 'low_usage' がサポートされていないため 'other' にマップ
 */
function mapReasonToStripeFeedback(
  reason?: string
): 'too_expensive' | 'missing_features' | 'other' | undefined {
  if (!reason) return undefined;

  const mapping: Record<string, 'too_expensive' | 'missing_features' | 'other'> = {
    'too_expensive': 'too_expensive',
    'missing_features': 'missing_features',
    'low_usage': 'other',  // Stripe API では low_usage が廃止されたため other にマップ
    'other': 'other'
  };

  return mapping[reason] || 'other';
}

/**
 * サブスクリプションキャンセル時の未使用分を計算して返金
 *
 * Stripe の proration preview を使用して正確な未使用分を算出します。
 * これにより、税込み/割引/複数アイテムでも正確に計算されます。
 *
 * @param stripe - Stripe クライアント
 * @param subscriptionId - サブスクリプション ID
 * @param idempotencyKey - べき等キー
 * @returns 返金情報
 */
async function refundUnusedAmount(
  stripe: Stripe,
  subscriptionId: string,
  idempotencyKey: string
): Promise<{
  refundAmount: number;
  currency: string;
  paymentIntentId: string | null;
  refundId: string | null;
}> {
  // サブスクリプションと最新インボイスを取得
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice.payment_intent']
  });

  if (!sub.customer || typeof sub.customer !== 'string') {
    throw new Error('Subscription has no valid customer ID');
  }

  // 全アイテムを削除してプレビューを作成（未使用分を計算）
  const deletedItems = sub.items.data.map(item => ({
    id: item.id,
    deleted: true as const,
  }));

  const prorationDate = Math.floor(Date.now() / 1000);

  console.log('📊 Previewing unused credit with upcoming invoice...', {
    subscription_id: subscriptionId,
    customer_id: sub.customer,
    proration_date: new Date(prorationDate * 1000).toISOString()
  });

  const upcoming = await stripe.invoices.upcoming({
    customer: sub.customer,
    subscription: sub.id,
    subscription_proration_date: prorationDate,
    subscription_items: deletedItems,
  });

  // 負の按分行（未使用分）を合計
  const negativeLines = upcoming.lines.data.filter(
    (l: Stripe.InvoiceLineItem) => typeof l.amount === 'number' && l.amount < 0
  );

  const creditCents = negativeLines.reduce((sum: number, l: Stripe.InvoiceLineItem) => sum + (l.amount ?? 0), 0);
  const refundCandidateCents = Math.abs(creditCents);

  console.log('💰 Prorated refund calculation:', {
    negative_lines_count: negativeLines.length,
    total_credit_cents: creditCents,
    refund_candidate_cents: refundCandidateCents,
    refund_candidate_dollars: (refundCandidateCents / 100).toFixed(2),
    currency: upcoming.currency
  });

  if (refundCandidateCents <= 0) {
    console.log('ℹ️ No refund needed (unused amount is 0)');
    return {
      refundAmount: 0,
      currency: upcoming.currency,
      paymentIntentId: null,
      refundId: null
    };
  }

  // 最新インボイスからPaymentIntentを取得
  const latestInvoice = typeof sub.latest_invoice === 'string'
    ? await stripe.invoices.retrieve(sub.latest_invoice, { expand: ['payment_intent'] })
    : sub.latest_invoice;

  if (!latestInvoice) {
    throw new Error('Cannot find latest invoice for refund');
  }

  const piId = typeof latestInvoice.payment_intent === 'string'
    ? latestInvoice.payment_intent
    : (latestInvoice.payment_intent as Stripe.PaymentIntent | null)?.id;

  if (!piId) {
    console.warn('⚠️ No PaymentIntent found - subscription may have been unpaid');
    return {
      refundAmount: refundCandidateCents,
      currency: upcoming.currency,
      paymentIntentId: null,
      refundId: null
    };
  }

  // PaymentIntentに対して部分返金を実行
  console.log('💳 Creating partial refund on PaymentIntent...', {
    payment_intent: piId,
    amount: refundCandidateCents,
    amount_dollars: (refundCandidateCents / 100).toFixed(2),
    currency: upcoming.currency
  });

  const refund = await stripe.refunds.create(
    {
      payment_intent: piId,
      amount: refundCandidateCents,
      reason: 'requested_by_customer',
      metadata: {
        subscription_id: subscriptionId,
        refund_type: 'prorated_cancellation',
        idempotency_key: idempotencyKey
      }
    },
    {
      idempotencyKey: `${idempotencyKey}-refund`
    }
  );

  console.log('✅ Refund created successfully:', {
    refund_id: refund.id,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status
  });

  return {
    refundAmount: refundCandidateCents,
    currency: upcoming.currency,
    paymentIntentId: piId,
    refundId: refund.id
  };
}
