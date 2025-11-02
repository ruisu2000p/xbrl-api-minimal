# XBRL API Minimal

XBRL財務データ分析プラットフォーム - Financial Information next (FIN)



## MCP (Model Context Protocol) 設定

このプロジェクトは、XBRL Financial MCPサーバーとして動作し、JWTと独自APIキーを組み合わせた認証システムを提供します。

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

**注意**: v8.0.0以降、JWT認証は不要になりました。APIキーのみで動作します。

#### Nodist環境でのトラブルシューティング

**問題**: Nodistを使用している環境で、環境変数`XBRL_API_KEY`が正しく渡されない場合があります。

**解決方法**: `npx`の代わりに`node`コマンドで直接`npx-cli.js`を実行してください。

```json


**原因**: Nodist（Node.jsバージョン管理ツール）が`npx`コマンドをラップしており、環境変数の引き継ぎを妨げる場合があります。上記の設定でNodistをバイパスして環境変数を正しく渡すことができます。

### 認証システムの仕組み (v8.0.0+)

このプロジェクトはセキュアなAPIキー認証を実装しています：

1. **独自APIキー** (Private Schema)
   - ダッシュボードから発行
   - `xbrl_` プレフィックス付き
   - Edge Function内部でService Role Keyに変換
   - RPC (SECURITY DEFINER) で安全に検証

2. **セキュリティ強化**
   - 直クエリ完全排除（RPC一択）
   - APIキーのマスキングログ
   - 入力バリデーション（二重）
   - trigram GIN高速検索



3. **APIキーを発行**
   - 「APIキー」タブを選択
   - 名前を入力して「APIキー発行」をクリック
   - ⚠️ APIキーは一度だけ表示されます



## ライセンス


