# Claude Desktop MCP設定ガイド

## 📋 設定手順

### 1. Claude Desktopの設定ファイルを開く

設定ファイルの場所：
```
Windows: %APPDATA%\Claude\claude_desktop_config.json
Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
```

### 2. MCP設定を追加

以下の設定をコピーして、`claude_desktop_config.json`に追加：

```json
{
  "mcpServers": {
    "xbrl-financial-data": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\Downloads\\xbrl-api-minimal\\mcp-server.js"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "xbrl_live_test_admin_key_2025"
      }
    }
  }
}
```

**注意**: 
- Windowsの場合、パスは`\\`でエスケープする必要があります
- Macの場合は通常のスラッシュ`/`を使用してください

### 3. Claude Desktopを再起動

設定を反映させるため、Claude Desktopを完全に終了して再起動してください。

### 4. 動作確認

Claude Desktopで以下のコマンドを実行して確認：

```
MCP: Get company list from XBRL API
```

## 🔧 カスタマイズオプション

### 本番用APIキーを使用する場合

本番用APIキーを生成している場合は、`XBRL_API_KEY`を置き換えてください：

```json
"env": {
  "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
  "XBRL_API_KEY": "xbrl_prod_xxxxxxxxxxxxxx"  // あなたの本番APIキー
}
```

### ローカル開発環境を使用する場合

```json
"env": {
  "XBRL_API_URL": "http://localhost:3000/api/v1",
  "XBRL_API_KEY": "xbrl_dev_local_key"
}
```

## 📊 利用可能なMCP機能

MCPサーバーが提供する機能：

1. **企業一覧取得**
   - 4,225社の日本企業データ
   - ページネーション対応

2. **企業検索**
   - 企業名で検索
   - 企業コード（例：S100L777）で検索
   - セクター別フィルタリング

3. **詳細情報取得**
   - 特定企業の詳細データ
   - 財務データへのアクセス

## 🔍 トラブルシューティング

### エラー: "MCP server not found"

1. `mcp-server.js`ファイルが存在することを確認
2. パスが正しいことを確認
3. Node.jsがインストールされていることを確認

### エラー: "API key invalid"

1. APIキーが正しいことを確認
2. APIキーの有効期限を確認
3. 本番環境のAPIキーを取得

### エラー: "Cannot connect to API"

1. インターネット接続を確認
2. APIエンドポイントが稼働中であることを確認：
   ```bash
   curl https://xbrl-api-minimal.vercel.app/api/v1/companies
   ```

## 📝 設定例

### Windows完全版

```json
{
  "mcpServers": {
    "xbrl-financial-data": {
      "command": "node",
      "args": ["C:\\Users\\pumpk\\Downloads\\xbrl-api-minimal\\mcp-server.js"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "xbrl_live_test_admin_key_2025",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Mac/Linux完全版

```json
{
  "mcpServers": {
    "xbrl-financial-data": {
      "command": "node",
      "args": ["/Users/username/Downloads/xbrl-api-minimal/mcp-server.js"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "xbrl_live_test_admin_key_2025",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 🚀 高度な設定

### 複数の環境を切り替える

```json
{
  "mcpServers": {
    "xbrl-production": {
      "command": "node",
      "args": ["path/to/mcp-server.js"],
      "env": {
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1",
        "XBRL_API_KEY": "xbrl_prod_key"
      }
    },
    "xbrl-development": {
      "command": "node",
      "args": ["path/to/mcp-server.js"],
      "env": {
        "XBRL_API_URL": "http://localhost:3000/api/v1",
        "XBRL_API_KEY": "xbrl_dev_key"
      }
    }
  }
}
```

## 📞 サポート

問題が発生した場合：
- GitHub Issues: https://github.com/ruisu2000p/xbrl-api-minimal/issues
- API Status: https://xbrl-api-minimal.vercel.app/api/health