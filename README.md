# XBRL財務データAPI

日本の上場企業4,231社の財務データを提供するAPIサービス。Supabase Edge Functionsによるセキュアな認証とレート制限を実装。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ruisu2000p/xbrl-api-minimal)

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

## 🤖 Claude Desktop MCP接続

### 自動セットアップ（推奨）

#### Windows
```powershell
# PowerShellで実行
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ruisu2000p/xbrl-api-minimal/main/setup-xbrl-mcp.ps1" -OutFile "setup.ps1"; .\setup.ps1
```

#### Mac/Linux
```bash
# ターミナルで実行
curl -o setup.sh https://raw.githubusercontent.com/ruisu2000p/xbrl-api-minimal/main/setup-xbrl-mcp.sh && bash setup.sh
```

### 手動セットアップ

1. **Claude Desktop設定ファイルを開く**
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/claude/claude_desktop_config.json`

2. **以下の設定を追加**
```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

3. **APIキーの取得**
   - https://xbrl-api-minimal.vercel.app/login にアクセス
   - ログインまたは新規登録
   - ダッシュボードからAPIキーを生成
   - 上記設定の `your-api-key-here` を置き換え

4. **Claude Desktopを再起動**

### 利用可能なMCPツール

- `search_companies` - 企業検索（名前、ID、ティッカーコード）
- `get_company` - 企業詳細情報取得
- `get_financial_data` - 財務データ取得
- `list_documents` - ドキュメント一覧取得
- `get_document_content` - ドキュメント内容取得

## 🔑 API使用方法

### 認証
```bash
curl -H "X-API-Key: your_api_key" \
  https://xbrl-api-minimal.vercel.app/api/v1/companies
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

## 🛠️ カスタマイズ

### データソースの変更
`scripts/migrate-data.js`を編集して、独自のデータソースから移行

### 料金プランの変更
`supabase/schema.sql`の`subscription_plans`テーブルを編集

### UIのカスタマイズ
`app/page.tsx`を編集してランディングページをカスタマイズ

## 📝 ライセンス
※正式リリース時に更新予定

## 🤝 サポート

- Issues: https://github.com/yourusername/xbrl-api-minimal/issues
- Email: support@example.com

## 🚀 今後の機能追加予定

- [ ] 財務比較機能
- [ ] グラフ表示
- [ ] Webhook対応
- [ ] バッチダウンロード
- [ ] 機械学習による予測分析trigger rebuild
# TypeScript fixes complete
