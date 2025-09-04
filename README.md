# XBRL Financial Data API

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://xbrl-api-minimal.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM: MCP Server](https://img.shields.io/npm/v/shared-supabase-mcp)](https://www.npmjs.com/package/shared-supabase-mcp)

日本企業の有価証券報告書（XBRL/EDINET）データにアクセスするためのAPIシステムです。4,231社の財務データをSupabase上で管理し、RESTful APIとMCP（Model Context Protocol）サーバーを通じて提供します。

## 🌟 主な機能

- **4,231社の有価証券報告書データ** - 2021年4月1日〜2022年3月31日の全上場企業データ
- **Markdown形式変換済み** - XBRLからMarkdownに変換済みで読みやすい
- **RESTful API** - シンプルなHTTP APIでアクセス可能
- **MCP統合** - Claude DesktopやAIツールから直接アクセス
- **Row Level Security** - Supabase RLSによる安全なデータアクセス
- **匿名認証サポート** - メール不要の自動認証

## 🚀 Quick Start

### 1. API利用（Vercelデプロイ済み）

```bash
# 企業一覧取得
curl https://xbrl-api-minimal.vercel.app/api/v1/companies

# 特定企業の詳細
curl https://xbrl-api-minimal.vercel.app/api/v1/companies/7203

# Markdownドキュメント取得
curl https://xbrl-api-minimal.vercel.app/api/v1/markdown-documents?company_id=S100TIJL
```

### 2. MCP Server（Claude Desktop向け）

#### インストール不要の利用方法

Claude Desktopの設定ファイル（`%APPDATA%\Claude\claude_desktop_config.json`）に追加：

```json
{
  "mcpServers": {
    "shared-supabase-mcp": {
      "command": "npx",
      "args": ["shared-supabase-mcp@latest"]
    }
  }
}
```

#### 利用可能なツール

- `query-my-data` - データ取得（SELECT）
- `insert-my-data` - データ挿入（INSERT）
- `update-my-data` - データ更新（UPDATE）
- `delete-my-data` - データ削除（DELETE）
- `get-storage-md` - Markdownファイル取得

詳細は[NPMパッケージ](https://www.npmjs.com/package/shared-supabase-mcp)を参照

## 📊 データ構造

### companies テーブル
| カラム | 型 | 説明 |
|--------|------|------------|
| id | text | 企業ID（例: S100TIJL）|
| ticker_code | text | ティッカーコード（例: 7203）|
| company_name | text | 企業名 |
| directory_name | text | ディレクトリ名 |
| created_at | timestamp | 作成日時 |

### markdown_files_metadata テーブル
| カラム | 型 | 説明 |
|--------|------|------------|
| id | uuid | メタデータID |
| company_id | text | 企業ID（FK）|
| fiscal_year | text | 会計年度 |
| file_name | text | ファイル名 |
| file_size | integer | ファイルサイズ |
| storage_path | text | Storageパス |

## 🛠️ セットアップ（開発者向け）

### 前提条件
- Node.js 18+
- Supabase アカウント
- Vercel アカウント（オプション）

### 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MCP Server（オプション）
SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

### ローカル開発

```bash
# リポジトリのクローン
git clone https://github.com/ruisu2000p/xbrl-api-minimal
cd xbrl-api-minimal

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

### MCP Serverのローカル開発

```bash
cd mcp-server
npm install
npm run build
node dist/server.js
```

## 📁 プロジェクト構造

```
xbrl-api-minimal/
├── app/                      # Next.js App Router
│   └── api/v1/              # API エンドポイント
│       ├── companies/       # 企業情報API
│       └── markdown-documents/ # Markdownドキュメント API
├── mcp-server/              # MCP サーバー実装
│   ├── src/                 # ソースコード
│   └── package.json         # MCP依存関係
├── scripts/                 # ユーティリティスクリプト
├── sql/                     # SQLスキーマ・クエリ
└── supabase/               # Supabase設定
    └── functions/          # Edge Functions
        └── xbrl-bff/       # BFF実装
```

## 📚 API ドキュメント

### GET /api/v1/companies
企業一覧を取得

**Query Parameters:**
- `limit` (number): 取得件数（デフォルト: 100）
- `offset` (number): オフセット
- `search` (string): 企業名/コードで検索

### GET /api/v1/companies/[id]
特定企業の詳細を取得

**Path Parameters:**
- `id`: 企業ID または ティッカーコード

### GET /api/v1/markdown-documents
Markdownドキュメントを取得

**Query Parameters:**
- `company_id` (string): 企業ID
- `fiscal_year` (string): 会計年度
- `file_name` (string): ファイル名

詳細は[docs/markdown-documents-api.md](docs/markdown-documents-api.md)を参照

## 🔒 セキュリティ

- **Row Level Security (RLS)**: すべてのテーブルでRLS有効
- **匿名認証**: ユーザー登録不要でセキュアなアクセス
- **APIキー管理**: Service RoleキーはサーバーサイドのみMCP Server
- **レート制限**: Edge Functionsでレート制限実装

## 📈 統計

- **企業数**: 4,231社
- **Markdownファイル**: 10万件以上
- **会計年度**: FY2015〜FY2024
- **データサイズ**: 約10GB

## 🤝 Contributing

プルリクエスト歓迎です！大きな変更の場合は、まずissueを開いて議論してください。

## 📄 License

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 🔗 関連リンク

- [NPMパッケージ (MCP Server)](https://www.npmjs.com/package/shared-supabase-mcp)
- [Vercelデプロイメント](https://xbrl-api-minimal.vercel.app)
- [Supabaseプロジェクト](https://wpwqxhyiglbtlaimrjrx.supabase.co)
- [作者GitHub](https://github.com/ruisu2000p)

## 📞 サポート

問題や質問がある場合は、[GitHubのIssues](https://github.com/ruisu2000p/xbrl-api-minimal/issues)で報告してください。

---

**Author:** ruisu2000 - [GitHub](https://github.com/ruisu2000p) | [NPM](https://www.npmjs.com/~ruisu2000)