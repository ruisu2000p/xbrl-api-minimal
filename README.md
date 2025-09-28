# XBRL API Minimal

XBRL財務データ分析プラットフォーム - Financial Information next (FIN)

## 環境設定

### 必要な環境変数

Vercelにデプロイする前に、以下の環境変数を設定してください：

1. **Vercelダッシュボード** → **Settings** → **Environment Variables**

```env
# Supabase設定（必須）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
XBRL_SUPABASE_SERVICE_KEY=your-service-role-key

# アプリケーションURL（本番環境用）
NEXT_PUBLIC_APP_URL=https://xbrl-api-minimal.vercel.app
```

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

このプロジェクトは、Claude DesktopでMCPサーバーと連携して使用できます。

### MCP設定方法

1. **Claude Desktopの設定ファイルを開く**

Windows:
```
%APPDATA%\Claude\claude_desktop_config.json
```

macOS:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

2. **Supabase MCPサーバーを追加**

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

3. **その他の推奨MCPサーバー**

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp"],
      "env": {
        "SUPABASE_URL": "your-url",
        "SUPABASE_SERVICE_KEY": "your-key"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-pat"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "FILESYSTEM_ROOT": "C:/Users/pumpk"
      }
    }
  }
}
```

### MCP環境変数

MCPサーバーで必要な環境変数：

- `SUPABASE_URL`: Supabaseプロジェクトの URL
- `SUPABASE_SERVICE_KEY`: Service Role Key（管理者権限）
- `GITHUB_PERSONAL_ACCESS_TOKEN`: GitHub API アクセス用（オプション）

### MCPを使った開発ワークフロー

1. **データベース操作**
   - `mcp__supabase__execute_sql`: SQLクエリの実行
   - `mcp__supabase__apply_migration`: マイグレーションの適用
   - `mcp__supabase__list_tables`: テーブル一覧の取得

2. **Edge Function管理**
   - `mcp__supabase__deploy_edge_function`: Edge Functionのデプロイ
   - `mcp__supabase__list_edge_functions`: Edge Function一覧の取得

3. **GitHub連携**
   - `mcp__github__create_pull_request`: プルリクエストの作成
   - `mcp__github__merge_pull_request`: プルリクエストのマージ

### セキュリティ注意事項

⚠️ **重要**: Service Role Keyは管理者権限を持つため、以下の点に注意：

- Service Role Keyをコミットしない
- `.env.local`ファイルで管理する
- 本番環境では環境変数として設定
- MCPの設定ファイルはGitにコミットしない

## デプロイ

Vercelへのデプロイは自動的に行われます（mainブランチへのpush時）。

手動デプロイ：
```bash
vercel --prod
```

## ライセンス

MIT