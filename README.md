# XBRL財務データAPI + セキュアMCPサーバー

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://xbrl-api-minimal.vercel.app)
[![NPM](https://img.shields.io/npm/v/shared-supabase-mcp-minimal)](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
[![Security](https://img.shields.io/badge/Security-v2.0.0-green)](https://github.com/ruisu2000p/xbrl-api-minimal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

日本企業5,220社の有価証券報告書（XBRL/EDINET）データにアクセスするためのAPI + セキュアMCPサーバー

## 🔒 重要: セキュリティアップデート v2.0.0

**⚠️ v1.9.1以前のバージョンには重大なセキュリティ脆弱性があります。すぐにv2.0.0へアップグレードしてください。**

### セキュリティ改善内容
- ✅ **環境変数による認証** - ハードコードされたキーを削除
- ✅ **レート制限** - 100リクエスト/分
- ✅ **SQLインジェクション防止** - 入力検証とサニタイゼーション
- ✅ **パストラバーサル防止** - セキュアなファイルアクセス
- ✅ **アクティビティ監視** - リアルタイムセキュリティログ

## 🌟 特徴

- **5,220社の財務データ** - 日本の全上場企業の有価証券報告書
- **Markdown形式** - XBRLから変換済みで読みやすい
- **セキュア設計** - 環境変数ベースの認証（v2.0.0+）
- **Claude Desktop完全対応** - 自然言語で財務データにアクセス
- **Vercelデプロイ済み** - すぐに利用可能

## 🚀 クイックスタート

### 1. セキュアMCPサーバー（v2.0.0） 🔒

#### インストール
```bash
npm install -g shared-supabase-mcp-minimal@latest
```

#### 環境変数設定
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

#### Claude Desktop設定
`%APPDATA%\Claude\claude_desktop_config.json`:

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
- **必ず環境変数（`env`セクション）を設定してください**
- `XBRL_API_KEY`には発行された**独自APIキー**を設定します（Supabase Anon Keyではありません）
- APIキーは[https://xbrl-api-minimal.vercel.app](https://xbrl-api-minimal.vercel.app)から取得してください
- Free/Basic/Pro/Enterpriseティアによってアクセス可能なデータ範囲が異なります

### 2. Web API エンドポイント

本番環境: https://xbrl-api-minimal.vercel.app

#### 主要エンドポイント
- `GET /api/v1/companies` - 企業一覧
- `GET /api/v1/companies/{id}` - 企業詳細
- `GET /api/v1/documents` - ドキュメント一覧
- `GET /api/v1/financial-metrics/{company_id}` - 財務指標

## 📊 利用可能なMCPツール

### `query-my-data`
Supabaseテーブルから財務データをクエリ（セキュリティ検証付き）

### `get-storage-md`
Supabase StorageからMarkdownドキュメントを取得（パス検証付き）

### `search-companies`
企業名またはティッカーコードで検索（入力サニタイゼーション付き）

### `get-security-status` (NEW)
セキュリティステータスと不審なアクティビティを監視

## 🔐 セキュリティベストプラクティス

1. **新しいAPIキーを生成** - Supabaseダッシュボードで
2. **`.env`ファイルをコミットしない** - バージョン管理から除外
3. **定期的にキーをローテーション** - 推奨: 90日ごと
4. **セキュリティステータスを監視** - `get-security-status`ツール使用
5. **アクティビティログをレビュー** - 不審なパターンの検出

## 📋 v1.xからv2.0への移行

1. **最新版をインストール**
   ```bash
   npm install -g shared-supabase-mcp-minimal@latest
   ```

2. **環境変数を設定**（上記参照）

3. **Claude Desktop設定を更新**（上記参照）

4. **新しいAPIキーを生成**（Supabaseダッシュボード）

5. **古いハードコードされたキーを無効化**

詳細は[SECURITY_MIGRATION_GUIDE.md](./SECURITY_MIGRATION_GUIDE.md)を参照

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

## 📈 バージョン履歴

### v2.0.0 (2024-01-XX)
- 🔒 環境変数による認証管理
- 🛡️ セキュリティ監視機能追加
- ⚡ レート制限実装
- 🚫 不正パターン検出
- 📊 セキュリティステータス確認ツール

### v1.9.1 (非推奨)
- ⚠️ ハードコードされた認証情報（セキュリティリスク）

## 🤝 コントリビューション

セキュリティ問題は非公開で報告してください。その他の問題や機能リクエストはGitHub Issuesをご利用ください。

## 📜 ライセンス

MIT

## 🔗 関連リンク

- [NPMパッケージ](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
- [GitHubリポジトリ](https://github.com/ruisu2000p/xbrl-api-minimal)
- [Vercel本番環境](https://xbrl-api-minimal.vercel.app)
- [Supabaseダッシュボード](https://app.supabase.com)

---

**⚠️ 重要**: v1.9.1以前を使用している場合は、セキュリティ脆弱性に対処するため、直ちにアップグレードしてください。# Force rebuild
