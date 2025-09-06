# XBRL Financial Data API - Minimal Edition

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://xbrl-api-minimal.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM: MCP Server](https://img.shields.io/npm/v/shared-supabase-mcp)](https://www.npmjs.com/package/shared-supabase-mcp)
[![NPM: Minimal](https://img.shields.io/npm/v/shared-supabase-mcp-minimal)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)

日本企業4,231社の有価証券報告書（XBRL/EDINET）データにアクセスするための最小構成API。Supabaseインフラ上で動作し、Claude Desktop統合をサポート。

## 🌟 特徴

- **4,231社の財務データ** - 日本の全上場企業の有価証券報告書
- **Markdown形式** - XBRLから変換済みで読みやすい
- **ゼロコンフィグ** - 環境変数の設定不要、設定ファイル追加のみ
- **Claude Desktop完全対応** - 自然言語で財務データにアクセス
- **最小構成** - 必要最小限のコードで実装（22ファイルのみ）
- **Vercelデプロイ済み** - すぐに利用可能
- **2つのMCPバージョン提供**:
  - `shared-supabase-mcp-minimal` v1.6.0 - ゼロコンフィグ版（MCPプロトコル完全対応、最小介入）
  - `shared-supabase-mcp` v1.0.0 - セキュア版（stdin認証）

## 🚀 クイックスタート

### 方法1: ゼロコンフィグ版（最も簡単！）🎉 v1.6.0

`%APPDATA%\Claude\claude_desktop_config.json` に追加するだけ:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["--loglevel=error", "shared-supabase-mcp-minimal@1.6.0"]
    }
  }
}
```

**🔥 最小介入版** - console.logのみリダイレクト、MCPプロトコル完全互換！
**⚠️ 重要**: `--loglevel=error` でnpxの警告を抑制（必須）

**設定不要！** anonキー内蔵で即動作。Claude Desktop再起動で完了。

### 方法2: セキュア版（カスタムキー使用）🔒

独自のSupabaseプロジェクトを使う場合:

#### 1. ラッパースクリプト作成

Windows用 (`mcp-wrapper.bat`):
```batch
@echo off
echo YOUR_ANON_KEY | npx shared-supabase-mcp@latest ^
  --supabase-url https://your-project.supabase.co ^
  --supabase-key-stdin
```

#### 2. Claude Desktop設定

```json
{
  "mcpServers": {
    "shared-supabase-mcp": {
      "command": "C:\\path\\to\\mcp-wrapper.bat"
    }
  }
}
```

### 💬 Claude Desktopでの使い方

#### 基本的な使用例
```
「日本の上場企業の一覧を取得してください」
「トヨタ自動車（7203）の財務データを見せてください」
「自動車業界の企業の売上高を比較してください」
```

#### 利用可能なツール
- `query-my-data` - データベースクエリ（自動認証）
- `get-storage-md` - Markdownファイル取得（自動認証）

### REST API（開発者向け）

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

## 📝 具体的な利用例

### 企業検索
```
「売上高が1兆円を超える企業を教えてください」
「東証プライムの電気機器セクターの企業一覧」
「社名に『ソニー』を含む企業を検索」
```

### 財務データ分析
```
「トヨタの過去5年間の売上推移を分析」
「製薬業界のROE比較」
「営業利益率が高い企業トップ10」
```

### 有価証券報告書の内容確認
```
「キーエンスの事業内容を説明してください」
「任天堂のリスク情報を要約」
「ソフトバンクグループの経営戦略を分析」
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

## 🛠️ 開発セットアップ（APIカスタマイズ用）

### 前提条件
- Node.js 18+
- Supabase アカウント（独自データベース使用時のみ）

### 環境変数（オプション）

**注意: MCPサーバー利用時は環境変数不要です。**

独自のSupabaseプロジェクトを使用する場合のみ `.env.local` を作成:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url  # オプション
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  # オプション
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # オプション
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

## 📦 NPMパッケージ

### ゼロコンフィグ版 (v1.6.0)
```bash
npm install -g shared-supabase-mcp-minimal@1.6.0
# または
npx --loglevel=error shared-supabase-mcp-minimal@1.6.0
```

### セキュア版
```bash
npm install -g shared-supabase-mcp
# または
npx shared-supabase-mcp@latest --help
```

## 📄 License

MIT License

## 🔗 リンク

- [NPM Package](https://www.npmjs.com/package/shared-supabase-mcp)
- [GitHub Repository](https://github.com/ruisu2000p/xbrl-api-minimal)
- [Vercel Deployment](https://xbrl-api-minimal.vercel.app)
- [Supabase Project](https://wpwqxhyiglbtlaimrjrx.supabase.co)

---

**Minimal is Beautiful** - 必要最小限のコードで最大限の価値を提供