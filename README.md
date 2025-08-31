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

## 📊 現在のデータ状況

- **総企業数**: 5,220社
- **データ期間**: 2015年〜2016年（FY2015/FY2016）
- **ファイル形式**: Markdown（XBRLから変換済み）
- **総ファイル数**: 約50,000ファイル
- **Storage構造**: 
  - FY2015/by_company/{company_id}/*.md
  - FY2016/{company_id}/{AuditDoc|PublicDoc}/*.md
- **メタデータテーブル**: `markdown_files_metadata`でインデックス管理

## 📁 プロジェクト構成

```
xbrl-api-minimal/
├── app/
│   ├── page.tsx           # ランディングページ
│   ├── api/
│   │   └── v1/
│   │       ├── companies/ # 企業一覧API
│   │       ├── documents/ # ドキュメント取得API
│   │       ├── markdown/  # Markdownファイル API
│   │       ├── search/    # 統合検索API
│   │       └── financial/ # 財務データAPI
│   ├── dashboard/         # ユーザーダッシュボード
│   └── auth/             # 認証ページ
├── supabase/
│   └── schema.sql        # データベーススキーマ
├── scripts/
│   ├── scan-storage-metadata.js # Storageスキャン
│   └── migrate-data.js  # データ移行スクリプト
├── sql/
│   └── create-markdown-metadata-table.sql # Markdownメタデータテーブル
└── public/              # 静的ファイル
```

## 🏗️ Supabase Storage統合セットアップ

### 1. Markdownメタデータテーブル作成

Supabaseダッシュボードで以下のSQLを実行：

```sql
-- sql/create-markdown-metadata-table.sql の内容をコピー&実行
```

### 2. Storageメタデータスキャン

```bash
# 最大1000ファイルをスキャン
node scripts/scan-storage-metadata.js 1000

# 全ファイルスキャン（時間がかかります）
node scripts/scan-storage-metadata.js
```

### 3. API使用例

#### Markdownファイル検索
```bash
# 企業名で検索
curl -H "X-API-Key: your_key" \
  "http://localhost:3000/api/v1/markdown?company_name=タカショー"

# 年度とドキュメントタイプで検索
curl -H "X-API-Key: your_key" \
  "http://localhost:3000/api/v1/markdown?fiscal_year=2021&document_type=PublicDoc"
```

#### 統合検索
```bash
# 企業・ファイル統合検索
curl -H "X-API-Key: your_key" \
  "http://localhost:3000/api/v1/search?q=タカショー&limit=10"
```

#### ファイル内容取得
```bash
# ファイルのフルコンテンツを取得
curl -X POST -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "S100L3K4/PublicDoc_markdown/0101010_honbun_*.md"}' \
  "http://localhost:3000/api/v1/markdown"
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
      "args": ["xbrl-mcp-server"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**npmパッケージ情報：**
- パッケージ名: `xbrl-mcp-server`
- バージョン: `0.1.1`
- インストール: `npm install -g xbrl-mcp-server`
- GitHub: https://github.com/ruisu2000p/xbrl-api-minimal

3. **APIキーの取得**
   - https://xbrl-api-minimal.vercel.app/login にアクセス
   - ログインまたは新規登録
   - ダッシュボードからAPIキーを生成
   - 上記設定の `your-api-key-here` を置き換え

4. **Claude Desktopを再起動**

### 利用可能なMCPツール

- `search_companies` - 企業検索（名前、ID、ティッカーコード）
- `get_company_details` - 企業詳細情報取得（基本情報、財務サマリー）
- `get_financial_data` - 詳細財務データ取得
- `list_companies` - 企業一覧取得（ページネーション対応）

### 使用例（Claude Desktop）

Claude Desktopで以下のようにご質問いただけます：

```
株式会社タカショーの2021年度の財務情報を教えて
→ search_companiesで企業を検索 → get_company_detailsで詳細取得

売上高1000億円以上の企業を5社探して
→ list_companiesで企業を取得し条件でフィルタリング

亀田製菓の競合他社分析をしたい
→ 複数のMCPツールを組み合わせて競合分析
```

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
