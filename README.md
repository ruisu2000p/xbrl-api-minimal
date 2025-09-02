# XBRL財務データAPI v1.1.1

日本の上場企業4,231社の財務データを提供するAPIサービス。Supabase Edge Functionsによるセキュアな認証とレート制限を実装。

## 🆕 最新アップデート (v1.1.1 - 2025年9月2日)
- **MCPサーバー修正**: v0.4.1でモジュールエクスポートの問題を修正
- **Markdown Documents API**: 10万件以上の有価証券報告書Markdownファイルへの直接アクセス
- **Supabase Storage統合**: FY2015〜FY2024の財務データをストレージから取得可能
- **日本語検索対応**: 企業名での検索機能を強化

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
      "args": ["xbrl-mcp-server@latest"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "xbrl_test_key_123"
      }
    }
  }
}
```

**npmパッケージ情報：**
- パッケージ名: `xbrl-mcp-server`
- 最新バージョン: **`0.4.1`** 🆕 (2025年9月2日更新)
- インストール: `npm install -g xbrl-mcp-server@latest`
- NPMページ: https://www.npmjs.com/package/xbrl-mcp-server
- GitHub: https://github.com/ruisu2000p/xbrl-api-minimal

3. **APIキーの取得**
   - https://xbrl-api-minimal.vercel.app/login にアクセス
   - ログインまたは新規登録
   - ダッシュボードからAPIキーを生成
   - 上記設定の `your-api-key-here` を置き換え

4. **Claude Desktopを再起動**

### 利用可能なMCPツール（v0.4.1）

#### 🆕 改善されたツール（v0.4.1）
- `search_companies_by_name` - 企業名検索（部分一致対応）
- `get_company_documents` - 財務文書取得（企業名/ID両対応）
- `analyze_company_financials` - 財務分析（ROE、ROA、利益率自動計算）
- `compare_companies` - 複数企業の比較分析

#### 主な改善点
- ✅ モジュールエクスポートエラーを修正
- ✅ 企業名での直接検索が可能に
- ✅ 前年比較機能の追加
- ✅ エラーハンドリングの改善

### 使用例（Claude Desktop）

企業名だけで検索できるようになりました！

```
「亀田製菓の財務分析をして」
→ 自動的に企業ID（S100TMYO）を解決して分析

「トヨタの2024年の売上高を教えて」
→ 企業名から直接財務データを取得

「ソニーのROEとROAを計算して」
→ analyze_financial_metricsで自動計算

「クスリのアオキの前年比成長率は？」
→ 前年比較と成長率を自動計算
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

## 🐛 トラブルシューティング

### MCPサーバーエラー
```
SyntaxError: The requested module '../src/server.js' does not provide an export named 'main'
```
**解決方法**: 最新版（v0.4.1以降）にアップデート
```bash
npm uninstall -g xbrl-mcp-server
npm install -g xbrl-mcp-server@latest
```

### Claude Desktopで接続できない
1. Claude Desktopを完全に終了
2. 設定ファイルを確認（JSONの構文エラーがないか）
3. Claude Desktopを再起動
4. ログファイルを確認: `%APPDATA%\Claude\logs\`

### APIキーエラー
- テスト用キー: `xbrl_test_key_123`（開発環境のみ）
- 本番用キー: https://xbrl-api-minimal.vercel.app/dashboard から生成

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
