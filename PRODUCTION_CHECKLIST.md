# 🚀 Stripe決済システム - 本番デプロイ前チェックリスト

本番環境にデプロイする前に、以下の項目を**必ず確認**してください。

---

## 📋 1. データベースマイグレーション実行

以下のマイグレーションファイルをSupabase SQL Editorで**順番に**実行してください:

```bash
# Supabase Dashboard → SQL Editor → New Query
```

### 実行順序:

1. **stripe_events テーブル作成** (冪等化用)
   ```sql
   -- ファイル: supabase/migrations/20251012_create_stripe_events_table.sql
   ```

2. **DB制約とインデックス追加**
   ```sql
   -- ファイル: supabase/migrations/20251012_add_db_constraints_and_indexes.sql
   ```

3. **(オプション) webhooktest2024@example.com の billing_cycle 更新**
   ```sql
   -- ファイル: supabase/migrations/20251012_update_webhooktest_billing_cycle.sql
   ```

**確認コマンド**:
```sql
-- テーブルが作成されたことを確認
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'private' AND table_name = 'stripe_events';

-- 制約が追加されたことを確認
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'private' AND table_name = 'user_subscriptions';
```

---

## 🔑 2. 環境変数の設定確認

### Vercel (Next.js App)

Vercel Dashboard → Settings → Environment Variables で以下を設定:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_... または sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... または pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_STANDARD_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_STANDARD_YEARLY_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxx (未実装)
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxxxx (未実装)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (サーバー側のみ)

# App URL
NEXT_PUBLIC_APP_URL=https://xbrl-api-minimal.vercel.app
```

### Supabase Edge Functions

Supabase Dashboard → Edge Functions → Secrets で以下を設定:

```bash
STRIPE_SECRET_KEY=sk_live_... または sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STANDARD_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_STANDARD_YEARLY_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxxxx

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://xbrl-api-minimal.vercel.app
```

**確認方法**:
```bash
# Edge Functionログで環境変数が読み込まれているか確認
# Supabase Dashboard → Edge Functions → stripe-webhook → Logs
```

---

## 🪝 3. Stripe Webhook設定

### Webhook URL設定

Stripe Dashboard → Developers → Webhooks → Add endpoint

**Webhook URL**:
```
https://your-project-ref.supabase.co/functions/v1/stripe-webhook
```

**監視するイベント**:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`

**Webhook Signing Secret取得**:
```bash
# Webhook作成後、Signing Secretをコピーして環境変数に設定
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## ✅ 4. フロントエンドの確認

### AccountSettings.tsx (Lines 1089-1090)

以下のコードになっていることを確認:

```typescript
const requestBody = {
  planType: 'standard', // 'freemium' | 'standard' | 'premium'
  billingCycle: billingPeriod // 'monthly' | 'yearly'
};
```

**❌ NG (古い実装)**:
```typescript
// これが残っていたらNG
const requestBody = {
  userId: user.data.user.id, // ❌ 削除済み
  planId: planData.id,       // ❌ 削除済み
  priceId: selectedPriceId,  // ❌ 削除済み
  billingPeriod: billingPeriod
};
```

---

## 🧪 5. テスト手順

### 5.1 Stripeテストモード

```bash
# テストカード情報
カード番号: 4242 4242 4242 4242
有効期限: 12/34 (任意の未来の日付)
CVC: 123
郵便番号: 12345
```

### 5.2 テスト手順

1. **新規アカウント作成**
2. **Standard Monthly プランを選択**
3. **Stripe Checkoutで支払い**
4. **Webhook処理を確認**:
   - Supabase Dashboard → Edge Functions → stripe-webhook → Logs
   - `checkout.session.completed` イベント処理
   - `customer.subscription.created` イベント処理
   - `billing_cycle: 'monthly'` が正しく保存されているか

5. **データベース確認**:
   ```sql
   SELECT user_id, billing_cycle, status, stripe_subscription_id
   FROM private.user_subscriptions
   WHERE user_id = 'your-test-user-id';

   -- billing_cycle が 'monthly' になっているか確認
   ```

6. **Standard Yearly プランでも同様にテスト**
   ```sql
   -- billing_cycle が 'yearly' になっているか確認
   ```

---

## 🔍 6. ログ監視ポイント

### Edge Function Logs (Supabase Dashboard → Edge Functions → Logs)

**正常系ログ例**:
```
✅ Webhook verified: customer.subscription.created
📝 Processing customer.subscription.created: {...}
✅ billing_cycle from metadata: yearly
📊 Resolved values: { user_id: '...', billing_cycle: 'yearly', plan: 'standard', status: 'active → active' }
✅ Subscription customer.subscription.created processed successfully for user xxx
```

**異常系ログ例 (要対応)**:
```
❌ No signature provided
❌ Webhook signature verification failed
❌ User not found for customer cus_xxx
⚠️ billing_cycle from API interval fallback: monthly
```

---

## 🚨 7. トラブルシューティング

### 問題: Webhookが届かない

**原因**:
- Webhook URLが間違っている
- Webhook Secretが間違っている
- Edge Functionがデプロイされていない

**確認方法**:
```bash
# Stripe Dashboard → Developers → Webhooks → イベントログを確認
# 送信済み / 失敗したイベントを確認

# Edge Function が動作しているか確認
curl https://your-project-ref.supabase.co/functions/v1/stripe-webhook
```

### 問題: billing_cycleがnullまたはmonthlyのまま

**原因**:
- metadata に `billing_period` が含まれていない
- Price ID の逆引きマップが正しくない

**確認方法**:
```sql
-- 最新のWebhookイベントを確認
SELECT id, payload->>'type' as event_type, payload->'data'->'object'->'metadata' as metadata
FROM private.stripe_events
ORDER BY created_at DESC
LIMIT 5;

-- metadata に billing_period が含まれているか確認
```

**修正方法**:
- `create-checkout-session/index.ts:147,154` でmetadataに`billing_period`を追加
- Edge Functionを再デプロイ

### 問題: 重複処理が発生する

**原因**:
- `stripe_events` テーブルが作成されていない
- 冪等化チェックが動作していない

**確認方法**:
```sql
-- 同じイベントIDが複数回処理されているか確認
SELECT id, COUNT(*) as count
FROM private.stripe_events
GROUP BY id
HAVING COUNT(*) > 1;
```

---

## 🎯 8. デプロイ前最終チェック

- [ ] フロントエンドコード: `planType` と `billingCycle` のみ送信
- [ ] Edge Function: `billing_period` を metadata に追加
- [ ] Webhook: 冪等化処理が実装されている
- [ ] Webhook: billing_cycle解決ロジックが3段階フォールバック
- [ ] DB: stripe_events テーブル作成済み
- [ ] DB: UNIQUE制約とインデックス追加済み
- [ ] 環境変数: Vercel と Supabase両方で設定済み
- [ ] Webhook URL: Stripe Dashboardで設定済み
- [ ] Stripe Price IDs: 環境変数と逆引きマップが一致
- [ ] テスト決済: Monthly と Yearly の両方でテスト成功

---

## 📊 9. 本番運用後の監視

### 定期確認項目 (毎週)

```sql
-- 1. Webhook処理失敗がないか確認
SELECT COUNT(*) as failed_webhooks
FROM private.stripe_events
WHERE processed_at > NOW() - INTERVAL '7 days'
AND payload->>'type' IN ('checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated');

-- 2. billing_cycleがnullのユーザーがいないか確認
SELECT user_id, billing_cycle, status
FROM private.user_subscriptions
WHERE billing_cycle IS NULL AND status = 'active';

-- 3. 支払い失敗がないか確認
SELECT user_id, status, updated_at
FROM private.user_subscriptions
WHERE status IN ('expired', 'cancelled')
AND updated_at > NOW() - INTERVAL '7 days';
```

---

## 📚 10. 参考ドキュメント

- **Stripe Webhook ガイド**: https://stripe.com/docs/webhooks
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Stripe API リファレンス**: https://stripe.com/docs/api
- **本プロジェクトのStripe決済完全ガイド**: (前述のまとめ参照)

---

**✅ すべてのチェック項目が完了したら、本番デプロイ準備完了です!**
