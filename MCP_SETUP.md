# XBRL API MCP Server セットアップガイド

## 1. MCPサーバーのインストール

### 1.1 依存関係のインストール
```bash
cd C:\Users\pumpk\xbrl-api-minimal-repo\mcp-server
npm install
```

## 2. Claude Desktop設定

### 2.1 設定ファイルの場所
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

### 2.2 設定ファイルを開く（Windows）
```bash
notepad %APPDATA%\Claude\claude_desktop_config.json
```

### 2.3 設定を追加

以下の設定を`claude_desktop_config.json`に追加してください：

```json
{
  "mcpServers": {
    "xbrl-api": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\xbrl-api-minimal-repo\\mcp-server\\index.js"],
      "env": {
        "XBRL_API_KEY": "xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app"
      }
    }
  }
}
```

**重要**: APIキーは自分のものに置き換えてください。ダッシュボードから取得できます：
https://xbrl-api-minimal.vercel.app/dashboard

## 3. Claude Desktopを再起動

設定を反映させるため、Claude Desktopを完全に終了して再起動してください：

1. システムトレイのClaudeアイコンを右クリック
2. 「Quit」または「終了」を選択
3. Claude Desktopを再度起動

## 4. 動作確認

Claude Desktopで以下のような質問をしてみてください：

```
「XBRL APIを使って企業一覧を取得してください」
「トヨタ自動車の詳細情報を教えてください」
「製造業の企業を検索してください」
```

## 5. 利用可能なツール

MCPサーバーは以下のツールを提供します：

### get_companies
企業一覧を取得します。
- `limit`: 取得する企業数の上限（デフォルト: 100）
- `search`: 企業名で検索

### get_company_details
特定企業の詳細情報を取得します。
- `company_id`: 企業ID（必須）

### get_financial_report
企業の有価証券報告書のセクションを取得します。
- `company_id`: 企業ID（必須）
- `section`: セクション名

### search_companies_by_industry
業種で企業を検索します。
- `industry`: 業種名（必須）

## 6. トラブルシューティング

### MCPサーバーが認識されない場合

1. **設定ファイルのパスを確認**
   - Windowsの場合、バックスラッシュをエスケープ（`\\`）

2. **Node.jsがインストールされているか確認**
   ```bash
   node --version
   ```

3. **ログを確認**
   - Claude Desktopのログファイルを確認
   - Windows: `%APPDATA%\Claude\logs`

### APIキーが無効な場合

1. ダッシュボードで新しいAPIキーを生成
2. `claude_desktop_config.json`のAPIキーを更新
3. Claude Desktopを再起動

## 7. カスタマイズ

### APIエンドポイントの追加

`mcp-server/index.js`を編集して、新しいツールを追加できます：

```javascript
{
  name: 'custom_tool',
  description: 'カスタムツールの説明',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string' }
    }
  }
}
```

## 8. セキュリティ注意事項

- APIキーは秘密情報です。GitHubにコミットしないでください
- 定期的にAPIキーを更新することを推奨します
- 不要になったAPIキーは削除してください