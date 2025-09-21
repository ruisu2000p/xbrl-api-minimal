# XBRL Financial MCP セットアップガイド

## APIキー発行方法

1. **Webサイトにアクセス**
   - https://xbrl-api-minimal.vercel.app/dashboard

2. **ログイン/サインアップ**
   - Googleアカウントでログイン

3. **APIキー発行**
   - ダッシュボードの「APIキー管理」セクション
   - 「新規APIキー発行」ボタンをクリック
   - キー名を入力して発行

## MCP設定

### 設定ファイル (.claude.json)

```json
{
  "mcpServers": {
    "xbrl-financial-secure": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@latest"],
      "env": {
        "SUPABASE_URL": "https://wpwqxhyiglbtlaimrjrx.supabase.co",
        "SUPABASE_API_KEY": "発行したAPIキーをここに入力"
      }
    }
  }
}
```

## セキュリティ

✅ **推奨**: ユーザーが発行したAPIキーを使用
- Rate limiting適用
- 使用状況追跡
- いつでも無効化可能

❌ **非推奨**: Anon keyの直接使用
- 全ユーザー共通
- 使用状況追跡不可
- セキュリティリスク

## 利用可能な機能

APIキー発行後、以下のMCP機能が利用可能：

- `search-companies` - 企業検索
- `query-my-data` - データクエリ
- `get-storage-md` - ドキュメント取得

## サポート

問題がある場合は、ダッシュボードのサポートセクションからお問い合わせください。