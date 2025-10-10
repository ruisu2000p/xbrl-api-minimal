# Stripe決済統合ガイド

## 概要
このドキュメントは、Stripe決済機能の実装と設定方法を説明します。

## 実装内容

### 1. 作成したファイル

#### APIエンドポイント
- `app/api/stripe/create-checkout-session/route.ts` - Stripe Checkoutセッション作成
- `app/api/stripe/webhook/route.ts` - Stripe Webhookハンドラー

#### フロントエンド統合
- `app/(protected)/dashboard/AccountSettings.tsx` - プラン変更時にStripe決済を統合

### 2. 環境変数設定

`.env.local`に以下の環境変数を追加する必要があります:

```bash
# Stripe Keys (テストモード)
STRIPE_SECRET_KEY=sk_test_your_actual_test_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here

# Stripe Product IDs
STRIPE_STANDARD_PRICE_ID=price_your_actual_standard_plan_price_id_here
```

### 3. Stripeダッシュボードでの設定手順

#### Step 1: Stripeアカウント作成
1. https://dashboard.stripe.com にアクセス
2. アカウントを作成（テストモードで開始）

#### Step 2: 商品とPrice IDを作成
1. ダッシュボードで「商品」→「商品を追加」
2. 商品名: "Standard Plan"
3. 価格: ¥2,980 / 月（月次サブスクリプション）
4. 作成後、Price IDをコピー（`price_xxxxx`形式）
5. `.env.local`の`STRIPE_STANDARD_PRICE_ID`に設定

#### Step 3: APIキーを取得
1. ダッシュボードで「開発者」→「APIキー」
2. 公開可能キー（pk_test_xxxxx）をコピー → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. シークレットキー（sk_test_xxxxx）をコピー → `STRIPE_SECRET_KEY`

#### Step 4: Webhookを設定
1. ダッシュボードで「開発者」→「Webhook」
2. 「エンドポイントを追加」をクリック
3. エンドポイントURL: `https://your-domain.vercel.app/api/stripe/webhook`
   - ローカルテストの場合: Stripe CLIを使用（後述）
4. 以下のイベントを選択:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. 署名シークレット（whsec_xxxxx）をコピー → `STRIPE_WEBHOOK_SECRET`

### 4. ローカル環境でのWebhookテスト

Stripe CLIをインストール:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# または公式サイトからダウンロード
# https://stripe.com/docs/stripe-cli
```

Stripe CLIでログイン:

```bash
stripe login
```

Webhookイベントを転送:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

これにより、ローカルの`whsec_`シークレットが表示されます。これを`.env.local`に設定します。

### 5. 決済フロー

1. **ユーザーがStandardプランを選択**
   - `AccountSettings.tsx`の「プラン変更」ボタンをクリック

2. **Stripe Checkoutセッション作成**
   - `/api/stripe/create-checkout-session`が呼び出される
   - Stripe Checkoutページへリダイレクト

3. **決済完了**
   - ユーザーがStripeで決済情報を入力
   - 決済完了後、`/dashboard?payment=success`にリダイレクト

4. **Webhook処理**
   - Stripeが`checkout.session.completed`イベントを送信
   - `/api/stripe/webhook`がイベントを受信
   - `user_subscriptions`テーブルを更新
   - Stripe情報（subscription_id, customer_id）を保存

### 6. データベーススキーマ

既存の`private.user_subscriptions`テーブルには以下のカラムが存在:

```sql
- stripe_subscription_id (text) - StripeサブスクリプションID
- stripe_customer_id (text) - Stripe顧客ID
- current_period_start (timestamptz) - 現在の課金期間開始日
- current_period_end (timestamptz) - 現在の課金期間終了日
- cancel_at_period_end (boolean) - 期間終了時にキャンセルするか
```

### 7. テスト方法

#### テストカード番号
Stripeのテストモードでは以下のカード番号が使用できます:

- **成功**: `4242 4242 4242 4242`
- **失敗（カード拒否）**: `4000 0000 0000 0002`
- **3Dセキュア必須**: `4000 0027 6000 3184`

有効期限: 任意の将来の日付（例: 12/34）
CVC: 任意の3桁（例: 123）
郵便番号: 任意（例: 12345）

#### テスト手順

1. **開発サーバー起動**
   ```bash
   npm run dev
   ```

2. **Stripe CLI起動（別ターミナル）**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. **ブラウザでテスト**
   - http://localhost:3000/dashboard にアクセス
   - 「プラン」タブを開く
   - Standardプランを選択
   - 「プラン変更」ボタンをクリック
   - Stripe Checkoutページでテストカード情報を入力
   - 決済完了を確認

4. **Webhook確認**
   - Stripe CLIのターミナルでイベント受信を確認
   - データベースで`user_subscriptions`テーブルの更新を確認

### 8. 本番環境デプロイ前のチェックリスト

- [ ] `.env.local`の全てのStripeキーを実際の値に置き換え
- [ ] Stripeダッシュボードで本番モードの商品とPrice IDを作成
- [ ] Vercel等の本番環境に環境変数を設定
- [ ] Stripe Webhookエンドポイントを本番URLで設定
- [ ] テストモードで決済フローを完全にテスト
- [ ] 本番モードに切り替えて最終テスト

### 9. トラブルシューティング

#### Webhook署名エラー
```
Error: Invalid signature
```
→ `.env.local`の`STRIPE_WEBHOOK_SECRET`が正しいか確認

#### 環境変数エラー
```
Error: Missing STRIPE_SECRET_KEY
```
→ `.env.local`が正しく読み込まれているか確認
→ サーバーを再起動

#### データベース更新失敗
```
Error updating subscription
```
→ Supabase RLSポリシーを確認
→ `SUPABASE_SERVICE_ROLE_KEY`または`XBRL_SUPABASE_SERVICE_KEY`が設定されているか確認

### 10. サブスクリプション管理機能（今後の実装）

以下の機能は今後追加可能:

- [ ] サブスクリプションキャンセル
- [ ] プラン変更（アップグレード/ダウングレード）
- [ ] 請求履歴表示
- [ ] 決済方法の更新
- [ ] Stripe Customer Portalの統合

### 11. セキュリティ注意事項

1. **環境変数の管理**
   - `STRIPE_SECRET_KEY`は絶対にクライアントサイドに公開しない
   - `.env.local`はGitにコミットしない

2. **Webhook署名検証**
   - 必ず`stripe.webhooks.constructEvent()`で署名を検証
   - 署名検証なしでWebhookを処理しない

3. **金額の検証**
   - 決済金額は必ずサーバーサイドで検証
   - クライアントから送信された金額を信用しない
