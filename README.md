# XBRL API Minimal

XBRL財務データ分析プラットフォーム - Financial Information next (FIN)

## 環境設定


### Supabase設定

1. **Supabaseダッシュボード** → **Authentication** → **URL Configuration**
   - Site URL: `https://xbrl-api-minimal.vercel.app`
   - Redirect URLs:
     - `https://xbrl-api-minimal.vercel.app/auth/callback`
     - `https://xbrl-api-minimal.vercel.app`

2. **Email Templates**
   - Confirm signup: リダイレクトURLを含むテンプレートに更新
   - Reset password: リダイレクトURLを含むテンプレートに更新

### ローカル開発

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集して実際の値を設定

# 開発サーバーの起動
npm run dev
```

### データベース構成

アプリケーションは以下のスキーマを使用します：

- `public`: 一般的なデータ（ユーザープロファイルなど）
- `private`: セキュアなデータ（APIキー、認証情報）
- `auth`: Supabase認証システム（自動管理）

### トラブルシューティング

#### セッションが維持されない場合

1. Supabaseの環境変数が正しく設定されているか確認
2. VercelのEnvironment Variablesに全ての必要な変数が設定されているか確認
3. Supabase Authentication URLsが正しく設定されているか確認

#### ビルドエラーが発生する場合

1. Node.jsバージョンが20.0.0以上であることを確認
2. 全ての依存関係が正しくインストールされているか確認
3. TypeScriptの型エラーがないか確認（`npm run type-check`）

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
      "args": ["shared-supabase-mcp-minimal@8.1.0"],
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
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "node",
      "args": ["C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js", "-y", "shared-supabase-mcp-minimal@8.3.0"],
      "env": {
        "XBRL_API_KEY": "your-api-key-from-dashboard"
      }
    }
  }
}
```

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

### MCP環境変数

XBRL Financial MCPサーバーで必要な環境変数：


### セキュリティ注意事項

⚠️ **重要**: Service Role Keyは管理者権限を持つため、以下の点に注意：

- Service Role Keyをコミットしない
- `.env.local`ファイルで管理する
- 本番環境では環境変数として設定
- MCPの設定ファイルはGitにコミットしない


## ライセンス


