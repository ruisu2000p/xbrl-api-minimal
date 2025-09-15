# shared-supabase-mcp-minimal v3.0.1 🚀

**Commercial XBRL Financial Data MCP Server - 286,742 documents from 1,100+ Japanese companies**

[![npm version](https://badge.fury.io/js/shared-supabase-mcp-minimal.svg)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
[![Security Status](https://img.shields.io/badge/Security-Enhanced-green)](https://github.com/ruisu2000p/xbrl-api-minimal)

## ⚠️ 重要な変更 - v3.0.1

**独自APIキーシステムを使用** - Supabase Anon Keyではなく、専用のXBRL APIキーを使用します

### 🔒 セキュリティ機能
- ✅ **独自APIキー認証** - ティア別アクセス制御
- ✅ **環境変数ベース** - ハードコードなし
- ✅ **SQLインジェクション対策** - 入力検証とサニタイゼーション
- ✅ **パストラバーサル防止** - セキュアなファイルアクセス
- ✅ **レート制限** - ティア別制限

## 📋 インストールとセットアップ

### ステップ1: 最新版をインストール
```bash
npm install -g shared-supabase-mcp-minimal@latest
# または npx を使用（推奨）
npx shared-supabase-mcp-minimal@latest
```

### ステップ2: APIキーを取得
[https://xbrl-api-minimal.vercel.app](https://xbrl-api-minimal.vercel.app) からAPIキーを取得してください

### ステップ3: 環境変数を設定
```bash
# Windows (Command Prompt)
set SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
set XBRL_API_KEY=your-api-key-here

# Windows (PowerShell)
$env:SUPABASE_URL = "https://wpwqxhyiglbtlaimrjrx.supabase.co"
$env:XBRL_API_KEY = "your-api-key-here"

# macOS/Linux
export SUPABASE_URL=https://wpwqxhyiglbtlaimrjrx.supabase.co
export XBRL_API_KEY=your-api-key-here
```

### ステップ4: Claude Desktop設定を更新

`%APPDATA%\Claude\claude_desktop_config.json` を編集:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**⚠️ 重要**:
- `XBRL_API_KEY`には発行された**独自APIキー**を設定
- Supabase Anon Keyではありません
- Free/Basic/Pro/Enterpriseティアによってアクセス範囲が異なります

## 🚀 特徴

- **1,100社以上の日本企業** - 包括的な財務データカバレッジ
- **4年分のデータ (2020-2024)** - 最新の有価証券報告書
- **Markdown形式** - XBRLから変換済みで読みやすい
- **独自APIキー認証** - ティア別アクセス制御
- **MCPプロトコル準拠** - クリーンなstdout、適切なJSON-RPC通信

## 📊 利用可能なツール

### `query-my-data`
Supabaseテーブルから財務データをクエリ（セキュリティ検証付き）

**パラメータ:**
- `table` (必須): テーブル名 (companies, markdown_files_metadata)
- `filters` (任意): SQLインジェクション対策済みのフィルタ条件
- `select` (任意): 選択するカラム
- `limit` (任意): 返す結果数

### `get-storage-md`
Supabase StorageからMarkdownドキュメントを取得（パス検証付き）

**パラメータ:**
- `storage_path` (必須): Markdownファイルへのセキュアなパス
- `max_bytes` (任意): 取得する最大バイト数（最大: 1MB）

### `search-companies`
企業名またはティッカーコードで検索（入力サニタイゼーション付き）

**パラメータ:**
- `query` (必須): 企業名またはティッカーコード
- `limit` (任意): 結果数（デフォルト: 10）

### `extract-financial-metrics`
財務指標を抽出

**パラメータ:**
- `company_id` (必須): 企業ID
- `storage_path` (必須): Markdownファイルパス

### `get-company-overview`
企業の包括的な概要を取得

**パラメータ:**
- `company_id` (必須): 企業ID
- `include_metrics` (任意): 財務指標を含むか

## 💰 料金プラン

| プラン | アクセス範囲 | 特徴 |
|--------|------------|------|
| **Free** | 直近1年間のデータ | 基本的な財務データアクセス |
| **Basic** | すべてのデータ | 全期間の財務データアクセス |
| **Pro** | すべてのデータ + 高速 | 優先サポート、高レート制限 |
| **Enterprise** | カスタム | 専用サポート、カスタム機能 |

## 🔐 セキュリティベストプラクティス

1. **APIキーを安全に管理** - 環境変数を使用
2. **`.env`ファイルをコミットしない** - バージョン管理から除外
3. **定期的にキーをローテーション** - 推奨: 90日ごと
4. **アクティビティログをレビュー** - 不審なパターンの検出

## 📝 サポート

問題が発生した場合:
1. [GitHub Issues](https://github.com/ruisu2000p/xbrl-api-minimal/issues)で報告
2. [API Documentation](https://xbrl-api-minimal.vercel.app/docs)を確認

## 📜 ライセンス

MIT

---

© 2024 XBRL API Minimal. All rights reserved.