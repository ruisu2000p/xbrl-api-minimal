# FIN - Financial Information next

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fruisu2000p%2Fxbrl-api-minimal)
[![Version](https://img.shields.io/badge/Version-5.0.0-green)](https://github.com/ruisu2000p/xbrl-api-minimal)
[![NPM](https://img.shields.io/npm/v/shared-supabase-mcp-minimal)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

XBRL財務データ分析プラットフォーム - 有価証券報告書の財務データをAI（Claude）で高度に分析

## 🚀 Quick Start

```bash
# インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start
```

## ✨ 主な機能

- 📊 **財務データ分析** - XBRL形式の有価証券報告書を自動解析
- 🤖 **AI分析** - Claude APIによる高度な財務分析とインサイト
- 🔑 **APIキー管理** - セキュアなAPIキー発行・管理システム
- 💳 **料金プラン** - フリーミアム/スタンダードプランに対応
- 🎨 **モダンUI** - Next.js 14 + Tailwind CSSによる洗練されたデザイン

### データ規模
- **286,742件**の財務文書を収録
- **1,100社以上**の上場企業データ
- **2020年〜2024年**の財務情報

## 📦 Tech Stack

| カテゴリ | 技術 |
|---------|------|
| **Frontend** | Next.js 14, React 18, TypeScript 5.3 |
| **Styling** | Tailwind CSS 3.4, Remixicon |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **AI Integration** | Claude API (via MCP) |
| **Deployment** | Vercel |
| **Security** | RLS, HMAC-SHA256, crypto.randomBytes |

## 📦 NPMパッケージ

### MCP Server for Claude
[![NPM](https://img.shields.io/npm/v/shared-supabase-mcp-minimal)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)

財務データ分析用のMCP（Model Context Protocol）サーバー:
```bash
npm install -g shared-supabase-mcp-minimal
```

詳細: [https://www.npmjs.com/package/shared-supabase-mcp-minimal](https://www.npmjs.com/package/shared-supabase-mcp-minimal)

## 🤖 MCP設定例

### Claude Desktop設定 (claude_desktop_config.json)

#### 方法1: Anonキーを使用（推奨）
```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjQ1NDgsImV4cCI6MjA3MjE0MDU0OH0.rQZKk5V8qmiDhIHRy5YMlYt4l9ccVlX96xNLZV7iTHs"
      }
    }
  }
}
```

#### 方法2: 独自APIキーを使用
```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "XBRL_API_KEY": "xbrl_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 重要な注意事項
⚠️ **環境変数について**:
- `SUPABASE_URL`: Supabaseプロジェクトの公開URL（必須）
- `SUPABASE_KEY`: Supabaseの公開用Anonキー（必須、`SUPABASE_ANON_KEY`ではなく`SUPABASE_KEY`を使用）
- `XBRL_API_KEY`: ダッシュボードで発行された独自APIキー（xbrl_で始まる、オプション）
- **注意**: MCPサーバーは`SUPABASE_KEY`という環境変数名を期待しています

### 設定方法
1. Claude Desktopの設定ファイルを開く
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. 上記のMCP設定をコピー＆ペースト
3. 他のMCPサーバーと名前が重複していないか確認（`xbrl-financial`が重複していたら片方削除）
4. Claude Desktopを完全に終了して再起動

### トラブルシューティング
- エラー「Unexpected token 'P'」が出る場合：環境変数が正しく設定されていません
- サーバーが二重起動する場合：設定ファイルに同じサーバーが複数登録されています
- 接続できない場合：`npx`コマンドが使えるか確認（`npx --version`を実行）

## 🔧 セットアップ

### 1. 環境変数の設定

`.env.local`ファイルを作成：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
API_KEY_SECRET=your-api-key-secret-minimum-32-chars

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQLエディタで以下を実行：

```bash
# データベーススキーマの構築
sql/master-setup.sql
```

3. Storage bucketの作成：
   - `markdown-files` (Public)

### 3. デプロイ

#### Vercel（推奨）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fruisu2000p%2Fxbrl-api-minimal)

環境変数を設定後、自動デプロイされます。

#### ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# http://localhost:3000 でアクセス
```

## 💰 料金プラン

| プラン | 月額 | データアクセス |
|--------|------|--------------|
| **フリーミアム** | 無料 | 直近1年間 | 
| **スタンダード** | ¥2,980 | 全期間 | 

## 📚 ドキュメント

- [アーキテクチャ設計](./docs/architecture.md)
- [API仕様書](./docs/api/)
- [MCP統合ガイド](./docs/mcp/)
- [デプロイメント手順](./docs/deploy/)

## 🏗️ プロジェクト構造

```
xbrl-api-minimal/
├── app/                # Next.js App Router
│   ├── actions/       # Server Actions
│   ├── api/           # API Routes
│   ├── auth/          # 認証ページ
│   └── dashboard/     # ダッシュボード
├── components/        # Reactコンポーネント
├── lib/              # 共通ライブラリ
│   └── supabase/     # Supabaseクライアント
├── types/            # TypeScript型定義
├── public/           # 静的ファイル
├── docs/             # ドキュメント
├── sql/              # データベーススキーマ
├── scripts/          # ユーティリティスクリプト
├── supabase/         # Supabase設定
└── config/           # アプリケーション設定
```

## 🛠️ 開発コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# 本番起動
npm start

# TypeScriptチェック
npm run type-check

# ESLint
npm run lint

# フォーマット
npm run format

# クリーンアップ
npm run clean

# クリーンインストール
npm run reinstall
```

## 🔒 セキュリティ

- **SHA-256**によるAPIキーハッシュ化
- **Row Level Security (RLS)** によるデータ保護
- **レート制限**実装（100リクエスト/分）
- **crypto.randomBytes**によるセキュアなキー生成
- **HMAC署名**による通信検証

## 🤝 コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 ライセンス

MIT License - 詳細は[LICENSE](./LICENSE)を参照

## 📧 お問い合わせ

- **GitHub Issues**: [issues](https://github.com/ruisu2000p/xbrl-api-minimal/issues)
- **Email**: support@fin-next.com

## 🙏 謝辞

- [Supabase](https://supabase.com) - Backend as a Service
- [Vercel](https://vercel.com) - Deployment Platform
- [Claude](https://claude.ai) - AI Analysis
- [Next.js](https://nextjs.org) - React Framework

---

Built with ❤️ by Financial Information next Team
