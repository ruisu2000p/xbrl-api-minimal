# XBRL Financial Data API - Minimal Edition

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://xbrl-api-minimal.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM: MCP Server](https://img.shields.io/npm/v/shared-supabase-mcp)](https://www.npmjs.com/package/shared-supabase-mcp)

日本企業4,231社の有価証券報告書（XBRL/EDINET）データにアクセスするための最小構成API。Supabaseインフラ上で動作し、Claude Desktop統合をサポート。

## 🌟 特徴

- **4,231社の財務データ** - 日本の全上場企業の有価証券報告書
- **Markdown形式** - XBRLから変換済みで読みやすい
- **最小構成** - 必要最小限のコードで実装（22ファイルのみ）
- **Claude Desktop対応** - MCPサーバー経由で直接アクセス可能
- **Vercelデプロイ済み** - すぐに利用可能

## 🚀 クイックスタート

### Claude Desktop統合（推奨）

`%APPDATA%\Claude\claude_desktop_config.json` に以下を追加:

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

Claude Desktopを再起動後、以下のコマンドが利用可能:
- `query-my-data` - SQLクエリ実行
- `get-storage-md` - Markdownファイル取得

### REST API

```bash
# 企業一覧取得
curl -H "X-API-Key: xbrl_demo" \
  https://xbrl-api-minimal.vercel.app/api/v1/companies

# 企業の財務データ取得
curl -H "X-API-Key: xbrl_demo" \
  https://xbrl-api-minimal.vercel.app/api/v1/companies/S100TIJL/data

# Markdownドキュメント取得
curl -H "X-API-Key: xbrl_demo" \
  https://xbrl-api-minimal.vercel.app/api/v1/markdown-documents?company_id=S100TIJL
```

## 📊 データ構造

### companies テーブル
| カラム | 型 | 説明 |
|--------|------|------------|
| id | text | 企業ID（例: S100TIJL）|
| ticker_code | text | ティッカーコード（例: 7203）|
| company_name | text | 企業名 |
| directory_name | text | データディレクトリ名 |

### Supabase Storage
```
markdown-files/
├── FY2016/          # 995社
├── FY2021/          # 5,220社
└── {company_id}/    # 各企業のMarkdownファイル
    └── PublicDoc_markdown/
```

## 🛠️ 開発セットアップ

### 前提条件
- Node.js 18+
- Supabase アカウント

### 環境変数

`.env.local` を作成:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### ローカル開発

```bash
git clone https://github.com/ruisu2000p/xbrl-api-minimal
cd xbrl-api-minimal
npm install
npm run dev
```

## 📁 最小構成

```
xbrl-api-minimal/
├── app/
│   ├── api/v1/              # APIエンドポイント（4ファイル）
│   ├── layout.tsx           # レイアウト
│   └── page.tsx             # ランディングページ
├── lib/
│   ├── middleware/          # レート制限
│   ├── supabase/           # クライアント
│   └── utils/              # ユーティリティ
├── docs/                    # ドキュメント（4ファイル）
└── sql/master-setup.sql    # データベース設定
```

合計: **22ファイルのみ**

## 📚 APIエンドポイント

### GET /api/v1/companies
企業一覧を取得

**パラメータ:**
- `page` - ページ番号
- `per_page` - 1ページあたりの件数
- `search` - 検索キーワード
- `sector` - 業種フィルター

### GET /api/v1/companies/[id]/data
企業の財務データとStorageファイルを取得

### GET /api/v1/companies/[id]/files
企業のファイル一覧を取得

**パラメータ:**
- `year` - 会計年度
- `file` - ファイルインデックス

### GET /api/v1/markdown-documents
Markdownドキュメントを直接取得

## 🔒 セキュリティ

- APIキー認証（デモキー: `xbrl_demo`）
- Supabase Row Level Security
- レート制限実装
- Service Roleキーはサーバーサイドのみ

## 📈 パフォーマンス

- **リポジトリサイズ**: 従来比67%削減
- **ファイル数**: 22ファイル（最小構成）
- **ビルド時間**: < 30秒
- **API応答時間**: < 200ms

## 🤝 Contributing

最小構成を維持するため、新機能追加は慎重に検討してください。バグ修正とパフォーマンス改善を優先します。

## 📄 License

MIT License

## 🔗 リンク

- [NPM Package](https://www.npmjs.com/package/shared-supabase-mcp)
- [GitHub Repository](https://github.com/ruisu2000p/xbrl-api-minimal)
- [Vercel Deployment](https://xbrl-api-minimal.vercel.app)
- [Supabase Project](https://wpwqxhyiglbtlaimrjrx.supabase.co)

---

**Minimal is Beautiful** - 必要最小限のコードで最大限の価値を提供