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

MIT License

Copyright (c) 2025 ruisu2000p

(doing business as "Financial Information next (FIN)")

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

