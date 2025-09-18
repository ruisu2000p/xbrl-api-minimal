# XBRL-Financial MCP設定更新手順

## 現在の設定状況

### 問題点：
1. **APIキーが未設定** - `env`オブジェクトが空
2. **バージョンが古い** - 1.8.1を使用中（最新は2.1.0）

### 現在の設定：
```json
"xbrl-financial": {
  "type": "stdio",
  "command": "npx",
  "args": ["--loglevel=error", "shared-supabase-mcp-minimal@1.8.1"],
  "env": {}
}
```

## 必要な更新内容

`.claude.json`ファイルの`mcpServers`セクションにある`xbrl-financial`を以下のように更新してください：

```json
"xbrl-financial": {
  "type": "stdio",
  "command": "npx",
  "args": [
    "--loglevel=error",
    "shared-supabase-mcp-minimal@2.1.0"
  ],
  "env": {
    "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
    "SUPABASE_ANON_KEY": "<your-jwt-token-here>"
  }
}
```

## 更新後の確認

1. Claude Desktopを再起動
2. MCPツールで以下を確認：
   - `mcp__xbrl-financial__search-companies`でテスト検索
   - `mcp__xbrl-financial__get-storage-md`でMarkdownドキュメント取得

## 注意事項

- Claude Desktopの再起動が必要です
- APIキーは公開鍵（anon key）なので安全です
- Service Role Keyは絶対に設定しないでください