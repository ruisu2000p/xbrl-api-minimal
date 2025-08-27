# 🏢 XBRL Japan MCP Server

日本企業の財務データ（XBRL形式）にアクセスするためのClaude Desktop MCPサーバー

[![npm version](https://badge.fury.io/js/@xbrl-jp%2Fmcp-server.svg)](https://www.npmjs.com/package/@xbrl-jp/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📊 概要

5,000社以上の日本企業の有価証券報告書データにClaude Desktopから直接アクセスできます。

### 主な機能

- 📈 **損益計算書** - 売上高、営業利益、純利益等
- 📊 **貸借対照表** - 資産、負債、資本構成
- 💰 **キャッシュフロー** - 営業CF、投資CF、財務CF
- 🔍 **企業検索** - 企業名、業種、ティッカーで検索
- 📐 **財務比率計算** - ROE、ROA、流動比率等
- 🔄 **企業比較** - 複数企業の財務データ比較

## 🚀 クイックスタート

### 1分でセットアップ

```bash
# グローバルインストール
npm install -g @xbrl-jp/mcp-server

# または直接実行
npx @xbrl-jp/mcp-server
```

### Claude Desktop設定

設定ファイルを編集:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Mac/Linux: `~/.claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://zxzyidqrvzfzhicfuhlo.supabase.co",
        "SUPABASE_ANON_KEY": "your-key-here"
      }
    }
  }
}
```

## 💬 使用例

Claude Desktopで以下のように質問:

```
👤: 亀田製菓の最新の財務データを教えて
🤖: get_income_statementツールを使用します...

👤: 食品業界の企業を5社リストアップして
🤖: search_companiesツールで検索します...

👤: トヨタとホンダの売上高を比較して
🤖: compare_financialsツールを使用します...
```

## 🛠️ 利用可能なツール

| ツール名 | 説明 |
|---------|------|
| `get_income_statement` | 損益計算書データ取得 |
| `get_balance_sheet` | 貸借対照表データ取得 |
| `get_cash_flow` | キャッシュフロー取得 |
| `get_financial_ratios` | 財務比率計算 |
| `search_companies` | 企業検索 |
| `get_company_profile` | 企業プロファイル |
| `compare_financials` | 財務比較 |
| `get_segment_data` | セグメント分析 |

## 📦 インストール方法

### NPM（推奨）
```bash
npm install -g @xbrl-jp/mcp-server
```

### Yarn
```bash
yarn global add @xbrl-jp/mcp-server
```

### GitHub
```bash
npm install -g github:xbrl-jp/mcp-server
```

### Docker
```bash
docker pull xbrljp/mcp-server
docker run -e SUPABASE_KEY=xxx xbrljp/mcp-server
```

## ⚙️ 設定

### 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| SUPABASE_URL | ✅ | SupabaseプロジェクトURL |
| SUPABASE_ANON_KEY | ✅ | 公開用APIキー |
| SUPABASE_SERVICE_KEY | ⭐ | 全権限APIキー（オプション） |

### 設定ファイル（.env）

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

## 📊 データソース

- **企業数**: 5,000社以上
- **期間**: 2016年〜2025年
- **更新頻度**: 四半期ごと
- **データ形式**: XBRL → Markdown変換済み
- **ソース**: EDINET（金融庁）

## 🔧 開発者向け

### ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/xbrl-jp/mcp-server.git
cd mcp-server

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### テスト実行

```bash
npm test
```

### ビルド

```bash
npm run build
```

## 🌏 多言語対応

- 日本語（デフォルト）
- 英語（計画中）

## 🤝 コントリビューション

プルリクエスト歓迎！

1. Fork it
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)を参照

## 🆘 サポート

- **Issues**: [GitHub Issues](https://github.com/xbrl-jp/mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xbrl-jp/mcp-server/discussions)
- **Email**: support@xbrl.jp

## 🏆 クレジット

- データソース: [EDINET](https://disclosure.edinet-fsa.go.jp/)
- インフラ: [Supabase](https://supabase.com)
- プロトコル: [Anthropic MCP](https://github.com/anthropics/mcp)

## 📈 ロードマップ

- [ ] 英語対応
- [ ] リアルタイム株価連携
- [ ] AIによる財務分析レポート生成
- [ ] Excelエクスポート機能
- [ ] WebUI版

---

Made with ❤️ for the Japanese financial community