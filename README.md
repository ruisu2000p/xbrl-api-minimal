# XBRL MCP Server

Claude DesktopからXBRL財務データ（Supabase）にアクセスするためのMCPサーバー

## セットアップ

### 1. 依存関係のインストール
```bash
cd xbrl-mcp-server
npm install
```

### 2. Claude Desktop設定

`%APPDATA%\Claude\claude_desktop_config.json`を編集：

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\Downloads\\xbrl-mcp-server\\index.js"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app",
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 3. APIキーの取得

1. https://xbrl-api-minimal.vercel.app にアクセス
2. アカウント作成/ログイン
3. ダッシュボードからAPIキーを取得
4. 上記設定の`your-api-key-here`を実際のキーに置換

### 4. Claude Desktopを再起動

設定を反映させるため、Claude Desktopを完全に終了してから再起動してください。

## 使用例

Claude Desktopで以下のように質問できます：

- 「亀田製菓の企業情報を教えて」
- 「食品業界の企業を5社検索して」
- 「S100LJ4Fの2021年の財務データを分析して」
- 「亀田製菓と明治の財務データを比較して」

## 利用可能なツール

- `search_companies` - 企業検索
- `get_company_details` - 企業詳細取得
- `get_financial_data` - 財務データ分析
- `compare_companies` - 企業比較

## トラブルシューティング

### MCPサーバーが認識されない
1. JSONファイルの構文エラーがないか確認
2. パスが正しいか確認（バックスラッシュをエスケープ）
3. Claude Desktopを完全に再起動

### APIエラーが発生する
1. APIキーが正しく設定されているか確認
2. APIキーの有効期限を確認
3. 使用制限に達していないか確認

## ライセンス

MIT