# Stripe連携・決済システム構築手順書

## xbrl-financial MCP サービス用サブスクリプション決済システム

---

## システム概要

### 料金プラン
- **プラン名**: xbrl-financial MCP Pro
- **月額料金**: ¥2,980/月
- **無料トライアル**: なし（即時課金）
- **決済サイクル**: 月次自動課金
- **支払方法**: クレジットカード（Visa, Mastercard, JCB, Amex）

### 技術スタック
- **決済**: Stripe Checkout + Stripe Billing
- **バックエンド**: Next.js API Routes + Supabase
- **認証**: Supabase Auth
- **データベース**: PostgreSQL (Supabase)
- **デプロイ**: Vercel

---

## Step 1: Stripeアカウント作成

### 1-1. Stripe日本法人への登録

1. **Stripe公式サイトにアクセス**
   - URL: https://stripe.com/jp

2. **アカウント作成**
   - 「今すぐ始める」をクリック
   - メールアドレス: `billing@fin.com`
   - パスワード設定（強固なもの）

3. **ビジネス情報入力**
   - ビジネスタイプ: 法人
   - 法人名: 株式会社Financial Information Next
   - 法人名（カナ）: カブシキガイシャファイナンシャルインフォメーションネクスト
   - 本店所在地: GMOバーチャルオフィス住所
   - 業種: ソフトウェア開発・SaaS
   - 事業内容: 財務情報分析サービスの提供

4. **代表者情報入力**
   - 氏名（代表取締役・兄）
   - 生年月日
   - 住所（代表取締役の自宅住所）
   - 電話番号

5. **銀行口座情報入力**
   - 振込先銀行: GMOあおぞらネット銀行（推奨）
   - 支店名
   - 口座番号
   - 口座名義: カブシキガイシャファイナンシャルインフォメーションネクスト

### 1-2. 本人確認書類のアップロード

**必要書類（いずれか）:**
1. 登記事項証明書（履歴事項全部証明書）- 発行から6ヶ月以内
2. 代表者の本人確認書類
   - 運転免許証（表裏）
   - マイナンバーカード（表面のみ）
   - パスポート

**アップロード方法:**
- Stripeダッシュボード → 設定 → 本人確認
- 書類を撮影またはスキャンしてアップロード
- 審査: 通常1-3営業日

### 1-3. 2段階認証の有効化

1. 設定 → セキュリティ → 2段階認証
2. Google Authenticatorでセットアップ
3. バックアップコード保存

---

## Step 2: Stripe商品・料金設定

### 2-1. 商品（Product）の作成

1. **Stripeダッシュボード**
   - 「商品」→「商品を追加」

2. **商品情報入力**
   - 商品名: `xbrl-financial MCP Pro`
   - 説明: `財務情報分析サービス - 有価証券報告書の検索・分析をAIで効率化`
   - 画像: サービスロゴ画像をアップロード（任意）

3. **料金モデル設定**
   - 料金タイプ: `定期支払い`
   - 請求期間: `月次`
   - 料金: `¥2,980`
   - 通貨: `JPY`
   - 請求方法: `前払い`

4. **無料トライアル設定**
   - トライアル期間: `なし`（即時課金）

5. **保存**
   - 商品ID（Price ID）をメモ: `price_XXXXXXXXXX`

### 2-2. 商品IDの確認

Stripeダッシュボードで作成した商品の `Price ID` を確認:
```
price_XXXXXXXXXX
```
このIDを後でNext.jsアプリに設定します。

---

## Step 3: Stripe Webhookの設定

### 3-1. Webhookエンドポイント作成（Next.js）

**ファイル作成: `app/api/webhooks/stripe/route.ts`**

```typescript
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // イベント処理
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { customer, status, current_period_end, trial_end } = subscription;

  await supabase
    .from('subscriptions')
    .upsert({
      customer_id: customer as string,
      subscription_id: subscription.id,
      status,
      current_period_end: new Date(current_period_end * 1000).toISOString(),
      trial_end: trial_end ? new Date(trial_end * 1000).toISOString() : null,
    });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('subscription_id', subscription.id);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);
  // 決済成功時の処理（メール送信など）
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.error('Payment failed:', invoice.id);
  // 決済失敗時の処理（リトライ通知メール送信など）
}
```

### 3-2. StripeダッシュボードでWebhook登録

1. **Stripeダッシュボード**
   - 開発者 → Webhooks → エンドポイントを追加

2. **エンドポイントURL入力**
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
   ※ 開発中はStripe CLIでローカルテスト可能

3. **イベント選択**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. **署名シークレット取得**
   - Webhookエンドポイント作成後、`whsec_XXXXXXXXXX` が表示される
   - `.env.local` に保存:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXX
   ```

---

## Step 4: Next.js + Supabase統合

### 4-1. 環境変数設定

**`.env.local` ファイル作成:**

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXX
STRIPE_PRICE_ID=price_XXXXXXXXXX

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4-2. Supabaseテーブル作成

**SQL実行（Supabase SQL Editor）:**

```sql
-- ユーザーテーブル（Supabase Authと連携）
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- サブスクリプションテーブル
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, -- active, trialing, past_due, canceled, etc.
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS（Row Level Security）設定
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみ閲覧可能
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- インデックス作成
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
```

### 4-3. Stripe Checkout実装

**ファイル作成: `app/api/create-checkout-session/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { userId, email } = await req.json();

  try {
    // Stripe Customerを作成または取得
    let customer;
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userData?.stripe_customer_id) {
      customer = await stripe.customers.retrieve(userData.stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });

      // Supabaseに保存
      await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
    }

    // Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // トライアルなし、即時課金
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

### 4-4. フロントエンド実装（Stripe Checkout）

**ファイル作成: `app/components/SubscribeButton.tsx`**

```typescript
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { useUser } from '@/hooks/useUser';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function SubscribeButton() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      alert('ログインしてください');
      return;
    }

    setLoading(true);

    try {
      // Checkout Session作成
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const { sessionId } = await res.json();

      // Stripe Checkoutへリダイレクト
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? '処理中...' : '今すぐ始める（¥2,980/月）'}
    </button>
  );
}
```

---

## Step 5: カスタマーポータル実装（サブスク管理）

### 5-1. カスタマーポータル設定

1. **Stripeダッシュボード**
   - 設定 → 請求 → カスタマーポータル
   - 「有効化」をクリック

2. **ポータル設定**
   - サブスクリプションのキャンセル: `許可`
   - プラン変更: `不許可`（単一プランのため）
   - 請求履歴の表示: `許可`
   - 支払方法の更新: `許可`

### 5-2. ポータルセッション作成API

**ファイル作成: `app/api/create-portal-session/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { userId } = await req.json();

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!userData?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
```

### 5-3. ポータルボタン実装

**ファイル作成: `app/components/ManageSubscriptionButton.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/useUser';

export default function ManageSubscriptionButton() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
    >
      {loading ? '処理中...' : 'サブスクリプションを管理'}
    </button>
  );
}
```

---

## Step 6: サブスクリプション状態の確認

### 6-1. ミドルウェアで課金状態をチェック

**ファイル作成: `middleware.ts`**

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 未ログイン時はログインページへ
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // サブスクリプション状態確認
  if (session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, trial_end, current_period_end')
      .eq('user_id', session.user.id)
      .single();

    const now = new Date();
    const isTrialing = subscription?.trial_end && new Date(subscription.trial_end) > now;
    const isActive = subscription?.status === 'active';

    // 課金なし＆トライアル期限切れ
    if (!isActive && !isTrialing) {
      return NextResponse.redirect(new URL('/pricing', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## Step 7: テスト

### 7-1. テストモードでの確認

1. **Stripeダッシュボード**
   - テストモードに切り替え
   - テスト用APIキーを使用

2. **テストカード番号**
   ```
   成功: 4242 4242 4242 4242
   3Dセキュア: 4000 0027 6000 3184
   失敗: 4000 0000 0000 0002
   ```

3. **動作確認項目**
   - [ ] ユーザー登録
   - [ ] Checkout Sessionの作成
   - [ ] 決済完了
   - [ ] Webhookイベント受信
   - [ ] Supabaseにサブスクリプション保存
   - [ ] カスタマーポータルでキャンセル
   - [ ] キャンセル時のWebhook受信

### 7-2. Stripe CLI でローカルテスト

```bash
# Stripe CLIインストール
npm install -g stripe

# ログイン
stripe login

# Webhookをローカルにフォワード
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# テストイベント送信
stripe trigger customer.subscription.created
```

---

## Step 8: 本番環境デプロイ

### 8-1. Vercel環境変数設定

1. **Vercelダッシュボード**
   - プロジェクト → Settings → Environment Variables

2. **環境変数追加**
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXX
   STRIPE_SECRET_KEY=sk_live_XXXXXXXXXX
   STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXX
   STRIPE_PRICE_ID=price_XXXXXXXXXX
   NEXT_PUBLIC_APP_URL=https://fin.com
   ```

### 8-2. Stripe本番モードに切り替え

1. Stripeダッシュボードで「本番環境に移行」
2. 本番APIキーを取得
3. Vercel環境変数を更新

### 8-3. Webhook URLを本番URLに変更

```
https://fin.com/api/webhooks/stripe
```

---

## セキュリティチェックリスト

- [ ] Stripe APIキーを環境変数で管理（ハードコード禁止）
- [ ] Webhook署名検証を実装
- [ ] Supabase RLSを有効化
- [ ] HTTPS通信のみ許可
- [ ] CSRFトークン検証
- [ ] レート制限実装（API Routes）
- [ ] エラーハンドリング（詳細エラーを顧客に見せない）

---

## 費用まとめ

| 項目 | 費用 |
|------|------|
| Stripe初期費用 | ¥0 |
| Stripe月額費用 | ¥0 |
| Stripe決済手数料 | 3.6%（¥2,980 × 3.6% = ¥107/件） |
| 振込手数料 | ¥0（週次/月次自動振込） |

**実質コスト**: 売上の3.6%のみ

---

## タイムライン

| 日程 | 作業内容 |
|------|----------|
| Day 1 | Stripeアカウント作成、本人確認書類提出 |
| Day 2-3 | 審査期間 |
| Day 4 | 商品・料金設定、Webhook設定 |
| Day 5 | Next.js統合実装（Checkout, Webhook） |
| Day 6 | Supabaseテーブル作成、RLS設定 |
| Day 7 | カスタマーポータル実装 |
| Day 8 | テストモードで動作確認 |
| Day 9 | 本番環境デプロイ |
| Day 10 | 本番モード切り替え、最終テスト |

---

## チェックリスト

### Stripeアカウント設定
- [ ] アカウント作成（billing@fin.com）
- [ ] ビジネス情報入力
- [ ] 本人確認書類アップロード
- [ ] 銀行口座登録
- [ ] 2段階認証有効化

### 商品・料金設定
- [ ] 商品作成（xbrl-financial MCP Pro）
- [ ] 料金設定（¥2,980/月）
- [ ] 無料トライアル設定（14日間）
- [ ] Price ID取得

### Webhook設定
- [ ] Webhookエンドポイント実装
- [ ] イベント選択
- [ ] 署名シークレット取得
- [ ] ローカルテスト（Stripe CLI）

### Next.js統合
- [ ] Stripe SDK導入
- [ ] Checkout Session実装
- [ ] Webhook処理実装
- [ ] カスタマーポータル実装
- [ ] ミドルウェア実装（課金状態チェック）

### Supabase設定
- [ ] テーブル作成（users, subscriptions）
- [ ] RLS設定
- [ ] インデックス作成

### テスト
- [ ] テストカードで決済テスト
- [ ] Webhook受信確認
- [ ] サブスクリプション作成確認
- [ ] キャンセル動作確認
- [ ] カスタマーポータル動作確認

### 本番環境
- [ ] Vercel環境変数設定
- [ ] 本番APIキー設定
- [ ] Webhook URL更新
- [ ] 本番決済テスト

---

## 参考資料

- Stripe公式ドキュメント: https://stripe.com/docs
- Stripe Checkoutガイド: https://stripe.com/docs/payments/checkout
- Stripe Webhookガイド: https://stripe.com/docs/webhooks
- Next.js + Stripeサンプル: https://github.com/vercel/nextjs-subscription-payments
