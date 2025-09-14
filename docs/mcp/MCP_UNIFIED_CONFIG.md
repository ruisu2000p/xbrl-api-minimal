# XBRL Financial MCP - 統一設定方法

## 🎯 唯一の正しい設定方法

### Claude Desktop設定 (`.claude.json`)

```json
{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "XBRL_API_KEY": "あなたのAPIキー",
        "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
      }
    }
  }
}
```

## なぜこの方法が唯一正しいのか

### ✅ メリット
1. **セキュリティ** - 個別のAPIキーで管理
2. **追跡可能** - 使用状況を個別に記録
3. **制御可能** - Rate limitingとアクセス制御
4. **シンプル** - 2つの環境変数だけ

### ❌ 使わない方法
- Supabase URLとAnon Keyの直接設定
- ハードコードされた認証情報
- 複数の設定ファイル

## 設定手順（3ステップ）

### 1. APIキーを発行
```
https://xbrl-api-minimal.vercel.app/dashboard
```

### 2. 設定ファイルを更新
```bash
notepad %USERPROFILE%\.claude.json
```

### 3. Claude Desktopを再起動

## 動作の仕組み

```mermaid
graph LR
    A[Claude Desktop] --> B[MCP Server]
    B --> C[API Key認証]
    C --> D[/api/v1/config]
    D --> E[Supabase設定取得]
    E --> F[データアクセス]
```

1. MCPサーバーがAPIキーを受け取る
2. `/api/v1/config`エンドポイントから設定を取得
3. 自動的にSupabaseに接続
4. すべての機能が利用可能に

## これだけ覚えればOK

```json
"env": {
  "XBRL_API_KEY": "xbrl_fre_で始まるキー",
  "XBRL_API_URL": "https://xbrl-api-minimal.vercel.app/api/v1"
}
```

---
**重要**: 他の設定方法は使用しないでください。この方法のみが正式にサポートされています。