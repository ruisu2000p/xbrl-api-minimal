# XBRL財務データAPI - 最小構成版

20年分の日本企業財務データを提供するAPIサービスの最小構成実装です。

## 🚀 クイックスタート

### 1. 環境準備（5分）

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/xbrl-api-minimal.git
cd xbrl-api-minimal

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集して必要な値を設定
```

### 2. 無料アカウント作成

#### Supabase（データベース）
1. https://supabase.com にアクセス
2. 無料アカウントを作成
3. 新しいプロジェクトを作成
4. Settings → API から以下をコピー:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### Stripe（決済）※後で設定可能
1. https://stripe.com にアクセス
2. 無料アカウントを作成
3. テストAPIキーをコピー

#### Backblaze B2（ストレージ）※後で設定可能
1. https://www.backblaze.com にアクセス
2. 無料アカウント作成（10GB無料）
3. APIキーを作成

### 3. データベースセットアップ

```bash
# Supabaseダッシュボードで:
# 1. SQL Editorを開く
# 2. supabase/schema.sqlの内容をコピー&実行
```

### 4. ローカル起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

### 5. Vercelへデプロイ（無料）

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

## 📁 プロジェクト構成

```
xbrl-api-minimal/
├── app/
│   ├── page.tsx           # ランディングページ
│   ├── api/
│   │   └── v1/
│   │       ├── companies/ # 企業一覧API
│   │       ├── documents/ # ドキュメント取得API
│   │       └── financial/ # 財務データAPI
│   ├── dashboard/         # ユーザーダッシュボード
│   └── auth/             # 認証ページ
├── supabase/
│   └── schema.sql        # データベーススキーマ
├── scripts/
│   └── migrate-data.js  # データ移行スクリプト
└── public/              # 静的ファイル
```

## 🔑 API使用方法

### 認証
```bash
curl -H "X-API-Key: your_api_key" \
  https://your-domain.vercel.app/api/v1/companies
```

### エンドポイント

#### 企業一覧
```
GET /api/v1/companies
```

#### ドキュメント取得
```
GET /api/v1/documents?company_id=S100LO6W&year=2021&section=0101010
```

#### 財務データ
```
GET /api/v1/financial?company_id=S100LO6W&year=2021
```

## 💰 料金プラン

| プラン | 月額 | 内容 |
|--------|------|------|
| Free | ¥0 | 1年分、100回/月 |
| Standard | ¥1,080 | 5年分、3,000回/月 |
| Pro | ¥2,980 | 20年分、無制限 |

## 📊 運用コスト

| ユーザー数 | インフラ費用 | 月間収益 | 純利益 |
|-----------|-------------|---------|--------|
| 100人 | ¥500 | ¥19,740 | ¥19,240 |
| 500人 | ¥5,900 | ¥98,700 | ¥92,800 |
| 1,000人 | ¥9,000 | ¥197,400 | ¥188,400 |

## 🛠️ カスタマイズ

### データソースの変更
`scripts/migrate-data.js`を編集して、独自のデータソースから移行

### 料金プランの変更
`supabase/schema.sql`の`subscription_plans`テーブルを編集

### UIのカスタマイズ
`app/page.tsx`を編集してランディングページをカスタマイズ

## 📝 ライセンス

MIT License

## 🤝 サポート

- Issues: https://github.com/yourusername/xbrl-api-minimal/issues
- Email: support@example.com

## 🚀 今後の機能追加予定

- [ ] 財務比較機能
- [ ] グラフ表示
- [ ] Webhook対応
- [ ] バッチダウンロード
- [ ] 機械学習による予測分析