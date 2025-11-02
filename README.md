# XBRL API Minimal

XBRL財務データ分析プラットフォーム - Financial Information next (FIN)



## MCP (Model Context Protocol) 設定

このプロジェクトは、XBRL Financial MCPサーバーとして動作します。

### XBRL Financial MCP設定方法

1. **Claude Desktopの設定ファイルを開く**

Windows:
```
%APPDATA%\Claude\claude_desktop_config.json
```

macOS:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

2. **XBRL Financial MCPサーバーを追加**

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@8.3.1"],
      "env": {
        "XBRL_API_KEY": "your-api-key-from-dashboard"
      }
    }
  }
}
```

1. **独自APIキー** (Private Schema)
   - ダッシュボードから発行
   - `xbrl_` プレフィックス付き
   - Edge Function内部でService Role Keyに変換
   - RPC (SECURITY DEFINER) で安全に検証


2. **APIキーを発行**
   - 「APIキー」タブを選択
   - 名前を入力して「APIキー発行」をクリック
   - ⚠️ APIキーは一度だけ表示されます



## ライセンス


