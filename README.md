# XBRL MCP Server for Supabase

Claude Desktop/MobileからXBRL財務データにアクセスするためのMCPサーバー。
Supabaseに保管された日本企業の有価証券報告書データ（4,231社）を検索・分析できます。

## 🚀 クイックスタート

### オプション1: npm経由でインストール（推奨）

```bash
npx @xbrl-jp/mcp-server
```

### オプション2: ローカルインストール

```bash
git clone https://github.com/ruisu2000p/xbrl-api-minimal.git
cd xbrl-api-minimal/mcp-server
npm install
```

## ⚙️ 設定

### Claude Desktop設定

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Mac/Linux**: `~/.config/claude/claude_desktop_config.json`

#### セキュア版（APIキー認証あり）

```json
{
  "mcpServers": {
    "xbrl-secure": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server", "--secure"],
      "env": {
        "SUPABASE_URL": "https://zxzyidqrvzfzhicfuhlo.supabase.co",
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Supabase直接接続版（Service Roleキー使用）

```json
{
  "mcpServers": {
    "xbrl-supabase": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server", "--enhanced"],
      "env": {
        "SUPABASE_URL": "https://zxzyidqrvzfzhicfuhlo.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## 🔑 認証情報の取得

### APIキー（セキュア版）

1. [XBRL API Dashboard](https://xbrl-api-minimal.vercel.app) にアクセス
2. アカウント作成/ログイン
3. ダッシュボードからAPIキーをコピー

### Service Roleキー（Supabase直接接続）

1. [Supabase Dashboard](https://supabase.com) にアクセス
2. Project Settings → API
3. Service Role Keyをコピー（⚠️ 秘密情報として扱ってください）

## 📱 モバイル対応

Claude iOSアプリでも利用可能です：

```json
{
  "mcpServers": {
    "xbrl-mobile": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server", "--remote"],
      "env": {
        "XBRL_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 🔄 Claude Desktop/アプリを再起動

設定を反映させるため、Claude Desktopを完全に終了してから再起動してください。

## 💡 使用例

Claude Desktop/モバイルアプリで以下のような質問ができます：

### 企業検索
```
「食品業界の上場企業を10社教えて」
「売上高1000億円以上の製造業企業は？」
```

### 財務データ分析
```
「亀田製菓の直近3年間の業績推移を分析して」
「S100LJ4Fの2021年度の財務諸表を要約して」
```

### 企業比較
```
「トヨタとホンダの収益性を比較して」
「食品業界上位5社のROEを比較分析して」
```

### セグメント分析
```
「ソニーの地域別売上構成を教えて」
「任天堂の製品カテゴリ別収益を分析して」
```

## 🛠️ 利用可能なツール

### 基本ツール（index-secure.js）
- `search_companies` - 企業名/業種で検索
- `get_company_details` - 企業詳細情報取得
- `get_financial_documents` - 財務書類一覧取得
- `read_financial_document` - 特定書類の内容取得

### 拡張ツール（index-enhanced.js）
- `get_income_statement` - 損益計算書取得
- `get_balance_sheet` - 貸借対照表取得
- `get_cash_flow` - キャッシュフロー計算書取得
- `get_financial_ratios` - 財務比率分析（ROE、ROA等）
- `search_companies` - 詳細検索（業種、規模等）
- `get_company_profile` - 企業プロファイル取得
- `compare_financials` - 複数企業の財務比較
- `get_segment_data` - セグメント別業績取得

## 🔧 トラブルシューティング

### MCPサーバーが認識されない
```bash
# 設定ファイルの構文チェック
jq . %APPDATA%\Claude\claude_desktop_config.json

# Claude Desktopの完全再起動
taskkill /F /IM claude.exe
start claude
```

### 接続エラーが発生する
- APIキーが正しいか確認
- ネットワーク接続を確認
- Supabase URLが正しいか確認

### データが見つからない
- 企業IDの形式を確認（例: S100LJ4F）
- 年度指定を確認（2021、FY2021等）

## 📊 データ仕様

- **対象企業**: 日本の上場企業 4,231社
- **データ期間**: 2016年度〜2021年度
- **書類形式**: 有価証券報告書（Markdown変換済み）
- **更新頻度**: 年次

## 🔒 セキュリティ

- APIキーは環境変数で管理
- Service Roleキーは絶対に公開しない
- HTTPSによる暗号化通信
- レート制限によるAPI保護

## 📚 関連リソース

- [XBRL API Documentation](https://xbrl-api-minimal.vercel.app/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [GitHub Repository](https://github.com/ruisu2000p/xbrl-api-minimal)

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 🤝 貢献

バグ報告や機能要望は[GitHub Issues](https://github.com/ruisu2000p/xbrl-api-minimal/issues)まで。

---

*最終更新: 2025年1月*