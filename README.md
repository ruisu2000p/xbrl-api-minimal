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

#### 直接Supabase接続版（推奨）

```json
{
  "mcpServers": {
    "xbrl-supabase": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\Downloads\\xbrl-mcp-server\\mcp-server\\index-unified.js"],
      "env": {
        "SUPABASE_SERVICE_KEY": "your-service-key-here（オプション）",
        "XBRL_API_KEY": "your-api-key-here（オプション）"
      }
    }
  }
}
```

#### 標準版（Vercel API経由）

```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server", "--api"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app",
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## 🔑 APIキーの取得

1. [XBRL API Dashboard](https://xbrl-api-minimal.vercel.app) にアクセス
2. アカウント作成/ログイン
3. ダッシュボードからAPIキーをコピー
4. 設定ファイルの`your-api-key-here`を置き換え

## 📱 モバイル対応（iOS/Android）

Claudeモバイルアプリでも利用可能です。

### iOSアプリでの設定

1. Claude iOSアプリを開く
2. 設定 → Developer → Edit Config
3. 以下の設定を追加：

```json
{
  "mcpServers": {
    "xbrl-mobile": {
      "command": "npx",
      "args": ["@xbrl-jp/mcp-server", "--remote"],
      "env": {
        "XBRL_API_KEY": "your-api-key-here",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app"
      }
    }
  }
}
```

### 重要なポイント

- **`--remote`オプションが必須**: モバイル専用の軽量モード
- **APIキーが必要**: ダッシュボードから取得
- **ネットワーク接続必須**: オンラインでのみ動作

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

### 基本ツール（無料アクセス）
- `search_companies` - 企業名/業種で検索
- `get_company` - 企業詳細情報取得
- `list_documents` - 財務書類一覧取得
- `read_document` - 特定書類の内容取得

### 拡張ツール（全バージョン利用可能）
- `get_all_years_data` - FY2015-FY2025の全年度データ一括取得
- `search_across_years` - 指定年度範囲でのデータ検索

### 認証必須ツール（APIキー必要）
- `analyze_financial` - 財務データの詳細分析（プレミアム機能）

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
- **データ期間**: FY2015〜FY2025（11年分）
- **書類形式**: 有価証券報告書（Markdown変換済み）
- **ファイル数**: 約10万ファイル（各企業20-24ファイル）
- **更新頻度**: 年次

## 🔒 セキュリティ

- APIキーは環境変数で管理
- Vercel API経由でのアクセス（Supabase直接接続なし）
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

*最終更新: 2025年8月*