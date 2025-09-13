# XBRL財務データAPI

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://xbrl-api-minimal.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

日本企業4,231社の有価証券報告書（XBRL/EDINET）データにアクセスするための最小構成API。Supabaseインフラ上で動作。

## 🌟 特徴

- **4,231社の財務データ** - 日本の全上場企業の有価証券報告書
- **Markdown形式** - XBRLから変換済みで読みやすい
- **ゼロコンフィグ** - 環境変数の設定不要、設定ファイル追加のみ
- **Claude Desktop完全対応** - 自然言語で財務データにアクセス
- **最小構成** - 必要最小限のコードで実装（22ファイルのみ）
- **Vercelデプロイ済み** - すぐに利用可能

## 🚀 クイックスタート

### MCP Server（Claude Desktop向け）🎉 v1.8.1

`%APPDATA%\Claude\claude_desktop_config.json` に追加するだけ:

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["--loglevel=error", "shared-supabase-mcp-minimal@1.8.1"]
    }
  }
}
```



**🔥 最小介入版** - console.logのみリダイレクト、MCPプロトコル完全互換！
**⚠️ 重要**: `--loglevel=error` でnpxの警告を抑制（必須）

### 🔐 APIキー認証版（第三者利用向け）NEW v0.5.0

自分のAPIキーで利用する場合:

```json
{
  "mcpServers": {
    "xbrl-api-auth": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "XBRL_API_KEY": "xbrl_live_your_key_here",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "API_MODE": "vercel"
      }
    }
  }
}
```

**APIキー取得方法:**
1. [ダッシュボード](https://xbrl-api-minimal.vercel.app/dashboard)にアクセス
2. アカウント作成・ログイン
3. APIキー生成（形式: `xbrl_live_xxxxx`）

**料金プラン:**
- **無料**: 100,000リクエスト/日
- **プレミアム**: 1,000,000リクエスト/日 + Supabase直接アクセス
- **エンタープライズ**: 無制限 + 専任サポート

詳細は[APIキー統合ガイド](docs/mcp-api-key-integration.md)を参照

### 💬 Claude Desktopでの使い方

#### 基本的な使用例
```
「クスリのアオキの財務データを検索してください」
「トヨタ自動車（7203）の有価証券報告書を見せてください」
「自動車業界の企業の売上高を比較してください」
```

#### 利用可能なツール
- `query-my-data` - データベースクエリ（自動認証）
- `get-storage-md` - Markdownファイル取得（自動認証）
- `search-companies` - 企業名検索（NEW in v1.8.0）

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

### markdown_files_metadata テーブル (v1.8.0で更新)
| カラム | 型 | 説明 |
|--------|------|------------|
| company_id | text | 企業ID（例: S100KLVZ）|
| company_name | text | 企業名 |
| fiscal_year | text | 会計年度（例: 2024）|
| storage_path | text | Storageパス |
| document_type | text | PublicDoc/AuditDoc |
| file_size | number | ファイルサイズ |
| has_tables | boolean | テーブル有無 |

### Supabase Storage
```
markdown-files/
├── FY2016/          # 995社
├── FY2021/          # 5,220社
└── FY2024/          # 4,231社
    └── {company_id}/
        └── PublicDoc/
```

## 🛠️ 開発セットアップ（APIカスタマイズ用）

### 前提条件
- Node.js 18+
- Supabase アカウント（独自データベース使用時のみ）

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

### 最新版 (v1.8.1) - 2025-09-07
```bash
npm install -g shared-supabase-mcp-minimal@1.8.1
# または
npx --loglevel=error shared-supabase-mcp-minimal@1.8.1
```

**トラブルシューティング**: 古いバージョンのエラーが出る場合：
```bash
npm uninstall -g xbrl-mcp-server
npm cache clean --force
```

## 📄 License

MIT License

## 🔗 リンク

- [NPM Package](https://www.npmjs.com/package/shared-supabase-mcp-minimal)
- [GitHub Repository](https://github.com/ruisu2000p/xbrl-api-minimal)
- [Vercel Deployment](https://xbrl-api-minimal.vercel.app)
- [Supabase Project](https://supabase.com/dashboard/project/wpwqxhyiglbtlaimrjrx)

---

**Minimal is Beautiful** - 必要最小限のコードで最大限の価値を提供
