# XBRL Financial API - Minimal Edition

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://xbrl-api-minimal.vercel.app)
[![NPM](https://img.shields.io/npm/v/shared-supabase-mcp-minimal)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
[![Security](https://img.shields.io/badge/Security-v2.1.0-green)](https://github.com/ruisu2000p/xbrl-api-minimal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

日本企業5,220社の有価証券報告書（XBRL/EDINET）データにアクセスするためのAPI + Claude Desktop MCP統合

## 🚀 最新バージョン v2.1.0

### 主な特徴
- ✅ **APIキー認証方式に統一** - セキュアで個別管理可能
- ✅ **レート制限** - 100リクエスト/分
- ✅ **Row Level Security** - データアクセス制御
- ✅ **監査ログシステム** - 全アクティビティを記録
- ✅ **Claude Desktop完全統合** - MCPツールで簡単アクセス

## 🌟 特徴

- **5,220社の財務データ** - 日本の全上場企業の有価証券報告書
- **Markdown形式** - XBRLから変換済みで読みやすい
- **セキュア設計** - 環境変数ベースの認証（v2.0.0+）
- **Claude Desktop完全対応** - 自然言語で財務データにアクセス
- **Vercelデプロイ済み** - すぐに利用可能

## 🚀 クイックスタート

### 1. APIキーの取得

1. [ダッシュボード](https://xbrl-api-minimal.vercel.app/dashboard)にアクセス
2. Googleアカウントでログイン
3. 「APIキー管理」から新規APIキーを発行

### 2. Claude Desktop設定

`.claude.json`に以下を追加：

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "XBRL_API_KEY": "あなたのAPIキー",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}
```

### 3. 使用開始

Claude Desktopを再起動後、MCPツールが利用可能になります。

## 📚 API仕様

### エンドポイント一覧

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/v1/config` | GET | API設定情報の取得 |
| `/api/v1/companies` | GET | 企業リスト取得 |
| `/api/v1/companies/{id}` | GET | 企業詳細情報 |
| `/api/v1/documents` | GET | ドキュメント一覧 |
| `/api/v1/financial-metrics/{company_id}` | GET | 財務指標取得 |

### 認証

すべてのAPIリクエストにはAPIキーが必要です：

```bash
curl -H "x-api-key: あなたのAPIキー" \
  https://xbrl-api-minimal.vercel.app/api/v1/companies
```

## 📊 利用可能なMCPツール

- `search-companies` - 企業検索（名前/ティッカーコード）
- `query-my-data` - データクエリ（柔軟な条件指定）
- `get-storage-md` - Markdownドキュメント取得
- `extract-financial-metrics` - 財務指標の自動抽出
- `get-company-overview` - 企業概要の総合取得

## 🔐 セキュリティ

### 実装済みのセキュリティ対策
- ✅ APIキー認証による個別アクセス管理
- ✅ Rate limiting (100リクエスト/分)
- ✅ Row Level Security (RLS) によるデータアクセス制御
- ✅ SQLインジェクション対策
- ✅ 監査ログシステム
- ✅ 自動セキュリティアップデート

### ベストプラクティス
1. APIキーは90日ごとにローテーション
2. GitHubにAPIキーをコミットしない
3. 使用状況を定期的にモニタリング

## 📊 料金プラン

| プラン | 料金 | 特徴 |
|--------|------|------|
| **フリーミアム** | ¥0/月 | 100社データ、最新1期分、APIコール無制限 |
| **プロフェッショナル** | ¥2,980/月 | 全5,220社、過去10年分、優先サポート |
| **エンタープライズ** | お問い合わせ | カスタマイズ、SLA保証、専任サポート |

## 🛠️ 開発者向け情報

### ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/ruisu2000p/xbrl-api-minimal.git
cd xbrl-api-minimal

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### プロジェクト構造

```
xbrl-api-minimal/
├── app/                    # Next.js アプリケーション
├── package/                # MCPサーバーパッケージ
│   ├── index-secure.js    # セキュアMCPサーバー（v2.0）
│   ├── index.js           # 旧版（非推奨）
│   └── README.md          # パッケージドキュメント
├── lib/                    # 共有ライブラリ
├── components/             # Reactコンポーネント
└── SECURITY_MIGRATION_GUIDE.md  # セキュリティ移行ガイド
```

## 🔄 更新履歴

### v2.1.0 (2025-01-14)
- APIキー認証方式に統一
- セキュリティ改善（RLS、監査ログ）
- Rate limiting実装
- MCP設定の簡素化

### v2.0.0 (2025-01-13)
- 環境変数ベースの認証に移行
- ハードコードされたキーを削除
- セキュリティ強化

### v1.0.0 (2025-01-10)
- 初回リリース
- 5,220社の財務データ対応
- Claude Desktop MCP統合

## 🤝 コントリビューション

セキュリティ問題は非公開で報告してください。その他の問題や機能リクエストはGitHub Issuesをご利用ください。

## 📜 ライセンス

MIT

## 🆘 サポート

- **Issues**: [GitHub Issues](https://github.com/ruisu2000p/xbrl-api-minimal/issues)
- **ダッシュボード**: [https://xbrl-api-minimal.vercel.app/dashboard](https://xbrl-api-minimal.vercel.app/dashboard)
- **NPMパッケージ**: [shared-supabase-mcp-minimal](https://www.npmjs.com/package/shared-supabase-mcp-minimal)

---

**Made with ❤️ by [ruisu2000p](https://github.com/ruisu2000p)**
