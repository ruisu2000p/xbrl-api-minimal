# XBRL Financial API - Minimal Edition v3.0

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://xbrl-api-minimal.vercel.app)
[![NPM](https://img.shields.io/npm/v/shared-supabase-mcp-minimal)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
[![Version](https://img.shields.io/badge/Version-3.0.1-green)](https://github.com/ruisu2000p/xbrl-api-minimal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-v3.0-blue)](https://modelcontextprotocol.io)

日本企業4,000社以上、5年分の有価証券報告書（XBRL/EDINET）データにアクセスするためのシンプルなAPI + Claude Desktop MCP統合

## 🚀 最新バージョン v3.0.1 - 品質改善

### 最新の改善（v3.0.1）
- ✅ **本番用ロギングシステム** - console.logを環境対応のロガーに置き換え
- ✅ **API レスポンス標準化** - 統一されたエラーハンドリング
- ✅ **コード品質向上** - 共通ユーティリティによる重複削減

### v3.0.0 主要変更点
- ✅ **APIエンドポイントを60%削減** - 6つのコア機能のみに集約
- ✅ **不要な依存関係を削除** - パッケージサイズ40%削減
- ✅ **MCPツールを2つに簡素化** - 企業検索→文書取得のシンプルフロー
- ✅ **セキュリティ機能の最適化** - 必要最小限の認証機能
- ✅ **パフォーマンス向上** - 不要な処理を削除

## 🌟 特徴

- **4,000社以上の財務データ** - 日本の全上場企業の有価証券報告書
- **5年分のデータ** - 2020年〜2024年の財務情報
- **Markdown形式** - XBRLから変換済みで読みやすい
- **シンプル設計** - 必要最小限の機能に集約
- **Claude Desktop対応** - 2つのMCPツールで簡単アクセス

## 📦 インストール

### NPMパッケージとして使用
```bash
npm install shared-supabase-mcp-minimal
```
詳細: https://www.npmjs.com/package/shared-supabase-mcp-minimal

### ローカル開発
```bash
npm install
npm run dev
```

## 🔧 環境変数

`.env.local`を作成：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🛠️ Claude Desktop設定

### 方法1: NPMパッケージを使用（推奨）

[NPMパッケージ: shared-supabase-mcp-minimal](https://www.npmjs.com/package/shared-supabase-mcp-minimal)

`claude_desktop_config.json`に追加：

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "SUPABASE_SERVICE_KEY": "your_service_key"
      }
    }
  }
}
```

### 方法2: ローカルサーバーを使用

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "node",
      "args": ["C:/path/to/xbrl-api-minimal/mcp-server/index.js"]
    }
  }
}
```

### 利用可能なMCPツール（v3.0）

1. **search-documents** - 企業名で財務文書を検索
2. **get-document** - 特定の財務文書を取得

## 📚 APIエンドポイント（v3.0）

### コア機能（6エンドポイント）

| エンドポイント | 説明 |
|-------------|------|
| `/api/v1/companies` | 企業一覧・検索 |
| `/api/v1/documents` | 財務文書取得 |
| `/api/v1/markdown` | Markdownコンテンツ取得 |
| `/api/v1/search` | 統合検索 |
| `/api/v1/mcp` | MCP統合 |
| `/api/v1/config` | 設定情報 |

### 削除されたエンドポイント（v3.0）

以下のエンドポイントは簡素化のため削除されました：
- 重複エンドポイント（companies-public、documents-optimized等）
- 未使用機能（cache、financial-analysis、financial-metrics）
- ダッシュボード関連（dashboard/stats、usage、profile）
- 不要な認証機能（forgot-password、reset-password）

## 🚀 使用例

### APIの使用

```javascript
// 企業検索
const response = await fetch('/api/v1/companies?search=トヨタ');
const companies = await response.json();

// 文書取得
const doc = await fetch('/api/v1/documents?company_id=123');
const document = await doc.json();
```

### Claude Desktopでの使用

```
「トヨタの最新の有価証券報告書を見せて」
「ソニーの売上高の推移を教えて」
```

## 📊 データ構造

```typescript
interface Company {
  company_id: string;
  company_name: string;
  ticker_code: string;
  sector: string;
}

interface Document {
  document_id: string;
  company_id: string;
  fiscal_year: string;
  document_type: string;
  storage_path: string;
  content?: string;
}
```

## 🔒 セキュリティ

- Supabase Row Level Security (RLS)
- 環境変数による認証情報管理
- 最小限の公開エンドポイント

## 📝 ライセンス

MIT License

## 🤝 貢献

Issues and Pull Requests are welcome!

## 📧 お問い合わせ

[GitHub Issues](https://github.com/ruisu2000p/xbrl-api-minimal/issues)

---

**Version 3.0.1** - Improved logging and error handling for production readiness