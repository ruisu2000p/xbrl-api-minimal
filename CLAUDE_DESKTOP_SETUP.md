# Claude Desktop - XBRL Financial Data API 接続設定

## 📋 概要

このガイドでは、Claude DesktopからXBRL Financial Data APIに接続するための設定手順を説明します。

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
cd C:\Users\pumpk\Downloads\xbrl-api-minimal

# MCPサーバー用の依存関係をインストール
npm install @modelcontextprotocol/sdk node-fetch
```

### 2. APIサーバーの起動

```bash
# Express APIサーバーを起動（ポート5001）
node express-server.js
```

### 3. Claude Desktop設定

Claude Desktopの設定ファイルを編集します：

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Mac:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

以下の内容を追加またはマージしてください：

```json
{
  "mcpServers": {
    "xbrl-financial-data": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\Downloads\\xbrl-api-minimal\\mcp-server.js"],
      "env": {
        "XBRL_API_URL": "http://localhost:5001"
      }
    }
  }
}
```

### 4. Claude Desktopを再起動

設定を反映させるため、Claude Desktopを完全に終了してから再起動してください。

## 📝 利用可能なコマンド

Claude Desktopで以下のコマンドが使用できます：

### 1. 企業のファイル一覧取得
```
「S100LJ4Fの有価証券報告書のファイル一覧を見せて」
「亀田製菓の2021年度の報告書セクション一覧」
```

### 2. 特定セクションの内容取得
```
「S100LJ4Fの企業の概況を表示して」
「亀田製菓の事業の状況セクションを見せて」
```

### 3. 企業検索
```
「トヨタを検索して」
「証券コード7203の企業を探して」
```

### 4. 財務概要の取得
```
「S100LJ4Fの主要な経営指標を見せて」
「亀田製菓の財務概要を表示」
```

### 5. 企業比較
```
「S100LJ4FとS100LJ65の事業の状況を比較して」
「複数企業の企業概況を並べて表示」
```

## 🔧 トラブルシューティング

### MCPサーバーが認識されない

1. Claude Desktopの設定ファイルのパスが正しいか確認
2. JSONの構文エラーがないか確認
3. Claude Desktopのログを確認：
   - Windows: `%APPDATA%\Claude\logs`
   - Mac: `~/Library/Logs/Claude`

### APIに接続できない

1. Express APIサーバーが起動しているか確認
   ```bash
   curl http://localhost:5001/health
   ```

2. ファイアウォールやセキュリティソフトがブロックしていないか確認

3. ポート5001が他のアプリケーションで使用されていないか確認

### エラーメッセージが表示される

1. `mcp-server.js`のログを確認
2. Express APIサーバーのコンソール出力を確認
3. 企業IDが正しい形式か確認（例: S100LJ4F）

## 📊 利用例

### 財務分析の例

```
User: S100LJ4Fの企業概況を詳しく分析して

Claude: S100LJ4F（亀田製菓株式会社）の企業概況を取得して分析します。

[MCPツール実行: get_company_files → get_file_content]

亀田製菓株式会社の2021年3月期の分析結果：
- 売上高: XXX億円
- 営業利益: XXX億円
- 主力製品: 米菓製品
...
```

### 複数企業比較の例

```
User: 食品業界の企業3社の業績を比較して

Claude: 食品業界の代表的な企業の業績を比較分析します。

[MCPツール実行: compare_companies]

比較結果：
1. 亀田製菓（S100LJ4F）
   - 売上高成長率: X%
   - 営業利益率: Y%

2. 企業B
   ...
```

## 🔐 セキュリティ注意事項

1. **ローカル使用のみ**: このMCPサーバーはローカル環境での使用を想定しています
2. **APIキー管理**: 本番環境では適切なAPIキー認証を実装してください
3. **データアクセス**: 機密データへのアクセスは適切に制限してください

## 📚 関連リソース

- [MCP SDK Documentation](https://github.com/anthropics/modelcontextprotocol)
- [Claude Desktop Help](https://support.anthropic.com/claude-desktop)
- [XBRL API Documentation](./docs/API_ROADMAP.md)

## 🆘 サポート

問題が解決しない場合は、以下の情報と共に報告してください：

1. Claude Desktopのバージョン
2. エラーメッセージの全文
3. 実行したコマンド
4. `claude_desktop_config.json`の内容（APIキー等は除く）

---

最終更新: 2025年8月15日